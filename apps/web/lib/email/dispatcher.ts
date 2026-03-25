import { and, eq, lte, sql, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { emailOutbox } from "@/lib/db/schema/email-outbox";
import { emailAttempts } from "@/lib/db/schema/email-attempts";
import { canSendEmail } from "./policy";
import { createResendProvider } from "./providers/resend-provider";
import { getTemplateForType } from "./template-registry";
import type { EmailProvider, ProviderSendInput } from "./provider";
import type { EmailType } from "./types";
import { nextRetryTime } from "./retry";

const DEFAULT_BATCH_SIZE = 25;

type OutboxRow = typeof emailOutbox.$inferSelect;

function getEmailFrom(): string {
  return process.env.EMAIL_FROM ?? "onboarding@resend.dev";
}

async function claimPendingJobs(
  now: Date,
  batchSize: number,
): Promise<ReadonlyArray<OutboxRow>> {
  const db = getDb();

  // Use raw SQL for FOR UPDATE SKIP LOCKED — Drizzle doesn't support it natively.
  // Only return IDs from the raw query, then fetch full rows via Drizzle so
  // column names are correctly mapped to the camelCase schema.
  const claimed = await db.execute(sql`
    UPDATE email_outbox
    SET status = 'processing', updated_at = ${now.toISOString()}
    WHERE id IN (
      SELECT id FROM email_outbox
      WHERE status = 'pending'
        AND send_after <= ${now.toISOString()}
      ORDER BY priority ASC, send_after ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${batchSize}
    )
    RETURNING id
  `);

  const ids = (claimed as unknown as Array<{ id: string }>).map((row) => row.id);
  if (ids.length === 0) return [];

  return db
    .select()
    .from(emailOutbox)
    .where(inArray(emailOutbox.id, ids));
}

async function recordAttempt(
  outboxId: string,
  attemptNumber: number,
  requestSnapshot: Record<string, unknown>,
  outcome: "success" | "retryable_failure" | "permanent_failure",
  responseSnapshot: Record<string, unknown> | null,
  errorCode: string | null,
): Promise<void> {
  const db = getDb();
  await db.insert(emailAttempts).values({
    outboxId,
    attemptNumber,
    requestSnapshot,
    responseSnapshot,
    outcome,
    errorCode,
  });
}

async function markSent(
  jobId: string,
  providerMessageId: string,
  now: Date,
): Promise<void> {
  const db = getDb();
  await db
    .update(emailOutbox)
    .set({
      status: "sent",
      providerMessageId,
      updatedAt: now,
    })
    .where(eq(emailOutbox.id, jobId));
}

async function markFailed(
  jobId: string,
  code: string,
  message: string,
  now: Date,
): Promise<void> {
  const db = getDb();
  await db
    .update(emailOutbox)
    .set({
      status: "failed",
      errorCode: code,
      errorMessage: message,
      updatedAt: now,
    })
    .where(eq(emailOutbox.id, jobId));
}

async function markSuppressed(jobId: string, now: Date): Promise<void> {
  const db = getDb();
  await db
    .update(emailOutbox)
    .set({
      status: "suppressed",
      updatedAt: now,
    })
    .where(eq(emailOutbox.id, jobId));
}

async function reschedule(
  jobId: string,
  retryAt: Date,
  code: string,
  message: string,
  attemptCount: number,
  now: Date,
): Promise<void> {
  const db = getDb();
  await db
    .update(emailOutbox)
    .set({
      status: "pending",
      sendAfter: retryAt,
      attemptCount,
      lastAttemptAt: now,
      errorCode: code,
      errorMessage: message,
      updatedAt: now,
    })
    .where(eq(emailOutbox.id, jobId));
}

async function processJob(
  job: OutboxRow,
  provider: EmailProvider,
  now: Date,
): Promise<void> {
  const allowed = await canSendEmail(
    job.type as EmailType,
    job.userId,
    job.toEmail,
  );
  if (!allowed) {
    await markSuppressed(job.id, now);
    return;
  }

  const template = getTemplateForType(job.type as EmailType);
  if (!template) {
    await markFailed(job.id, "template_not_found", `No template for type: ${job.type}`, now);
    return;
  }

  const payload = job.payload as Record<string, unknown>;
  const subject = template.subject(payload);
  const element = template.render(payload);

  const sendInput: ProviderSendInput = {
    from: getEmailFrom(),
    to: job.toEmail,
    subject,
    react: element,
    headers: (job.headers as Record<string, string>) ?? {},
    tags: [
      { name: "category", value: job.category },
      { name: "type", value: job.type },
      { name: "outbox_id", value: job.id },
    ],
  };

  const result = await provider.send(sendInput);
  const newAttemptCount = job.attemptCount + 1;

  await recordAttempt(
    job.id,
    newAttemptCount,
    { to: job.toEmail, subject, type: job.type },
    result.ok ? "success" : result.retryable ? "retryable_failure" : "permanent_failure",
    result.ok ? { providerMessageId: result.providerMessageId } : { code: result.code, message: result.message },
    result.ok ? null : result.code,
  );

  if (result.ok) {
    await markSent(job.id, result.providerMessageId, now);
    return;
  }

  if (!result.retryable) {
    await markFailed(job.id, result.code, result.message, now);
    return;
  }

  const retryAt = nextRetryTime(newAttemptCount, now);
  if (!retryAt) {
    await markFailed(job.id, result.code, `Max retries exceeded: ${result.message}`, now);
    return;
  }

  await reschedule(job.id, retryAt, result.code, result.message, newAttemptCount, now);
}

const STALE_PROCESSING_MINUTES = 10;

async function reclaimStaleJobs(now: Date): Promise<void> {
  const db = getDb();
  const staleCutoff = new Date(
    now.getTime() - STALE_PROCESSING_MINUTES * 60_000,
  );
  await db.execute(sql`
    UPDATE email_outbox
    SET status = 'pending', updated_at = ${now.toISOString()}
    WHERE status = 'processing'
      AND updated_at < ${staleCutoff.toISOString()}
  `);
}

export async function dispatchBatch(
  now: Date = new Date(),
  batchSize: number = DEFAULT_BATCH_SIZE,
): Promise<{ processed: number; errors: number }> {
  await reclaimStaleJobs(now);

  const jobs = await claimPendingJobs(now, batchSize);
  const provider = createResendProvider();

  let errors = 0;

  for (const job of jobs) {
    try {
      await processJob(job, provider, now);
    } catch (err) {
      errors += 1;
      console.error("[dispatcher] Unhandled error processing job:", job.id, err);
      const newAttemptCount = job.attemptCount + 1;
      try {
        await recordAttempt(
          job.id,
          newAttemptCount,
          { type: job.type },
          "retryable_failure",
          null,
          "dispatcher_error",
        );
        const retryAt = nextRetryTime(newAttemptCount, now);
        if (retryAt) {
          await reschedule(job.id, retryAt, "dispatcher_error", String(err), newAttemptCount, now);
        } else {
          await markFailed(job.id, "dispatcher_error", `Max retries exceeded: ${String(err)}`, now);
        }
      } catch {
        // Stale job reclaim will recover this on the next dispatch cycle
      }
    }
  }

  return { processed: jobs.length, errors };
}
