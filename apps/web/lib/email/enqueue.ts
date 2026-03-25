import { getDb } from "@/lib/db";
import { emailOutbox } from "@/lib/db/schema/email-outbox";
import type { EmailIntent } from "./types";
import { createUnsubscribeHeaders } from "./unsubscribe";
import { CRITICAL_EMAIL_TYPES } from "./types";

export async function enqueueEmailIntent(
  intent: Readonly<EmailIntent>,
): Promise<void> {
  const db = getDb();

  const headers: Record<string, string> = {};

  if (!CRITICAL_EMAIL_TYPES.has(intent.type) && intent.userId) {
    const unsubHeaders = createUnsubscribeHeaders(intent.userId, intent.type);
    Object.assign(headers, unsubHeaders);
  }

  await db
    .insert(emailOutbox)
    .values({
      userId: intent.userId,
      toEmail: intent.toEmail,
      category: intent.category,
      type: intent.type,
      idempotencyKey: intent.idempotencyKey,
      provider: "resend",
      templateVersion: intent.templateVersion,
      payload: intent.payload as Record<string, unknown>,
      headers,
      status: "pending",
      priority: intent.priority,
      sendAfter: intent.sendAfter,
      attemptCount: 0,
    })
    .onConflictDoNothing({
      target: emailOutbox.idempotencyKey,
    });
}

export async function safeEnqueueEmailIntent(
  intent: Readonly<EmailIntent>,
): Promise<void> {
  try {
    await enqueueEmailIntent(intent);
  } catch (err) {
    console.error(
      "[email] Failed to enqueue email intent:",
      intent.type,
      intent.idempotencyKey,
      err,
    );
  }
}
