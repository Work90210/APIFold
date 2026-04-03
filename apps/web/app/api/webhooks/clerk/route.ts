import { NextResponse, type NextRequest } from 'next/server';
import { Webhook } from 'svix';
import { safeEnqueueEmailIntent } from '@/lib/email/enqueue';
import { buildWelcomeIntent, buildAccountDeletedIntent } from '@/lib/email/intent-builder';
import { getDb } from '@/lib/db';
import { serverTrackSignUp } from '@/lib/analytics/events.server';
import { emailPreferences } from '@/lib/db/schema/email-preferences';
import { emailOutbox } from '@/lib/db/schema/email-outbox';
import { emailThresholdState } from '@/lib/db/schema/email-threshold-state';
import { eq, and } from 'drizzle-orm';

const CLERK_WEBHOOK_SECRET = process.env['CLERK_WEBHOOK_SECRET'];

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!CLERK_WEBHOOK_SECRET) {
    // eslint-disable-next-line no-console
    console.error('[webhook] CLERK_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  const headerPayload = request.headers;
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  // Reject oversized payloads before reading body (public endpoint, no auth)
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 1_048_576) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const body = await request.text();
  if (Buffer.byteLength(body, 'utf8') > 1_048_576) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const wh = new Webhook(CLERK_WEBHOOK_SECRET);

  let event: { type: string; data: Record<string, unknown> };
  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as typeof event;
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  // Handle events
  switch (event.type) {
    case 'user.created': {
      const data = event.data as {
        id?: string;
        email_addresses?: Array<{ email_address: string }>;
        first_name?: string | null;
      };
      const email = data.email_addresses?.[0]?.email_address;
      const svixEventId = svixId;
      if (email) {
        await safeEnqueueEmailIntent(
          buildWelcomeIntent(email, data.first_name ?? null, svixEventId),
        );
      }
      if (data.id) {
        try {
          const db = getDb();
          await db.insert(emailPreferences).values({ userId: data.id }).onConflictDoNothing();
        } catch (err) {
          console.error('[webhook] Failed to create email preferences:', err);
        }
        await serverTrackSignUp(data.id);
      }
      break;
    }
    case 'user.deleted': {
      const data = event.data as {
        id?: string;
        email_addresses?: Array<{ email_address: string }>;
      };
      const email = data.email_addresses?.[0]?.email_address;
      const svixEventId = svixId;
      if (email) {
        await safeEnqueueEmailIntent(buildAccountDeletedIntent(email, svixEventId));
      }
      if (data.id) {
        try {
          const db = getDb();
          await db.delete(emailPreferences).where(eq(emailPreferences.userId, data.id));
          await db.delete(emailThresholdState).where(eq(emailThresholdState.userId, data.id));
          await db.update(emailOutbox).set({ status: 'suppressed' }).where(
            and(eq(emailOutbox.userId, data.id), eq(emailOutbox.status, 'pending')),
          );
        } catch (err) {
          console.error('[webhook] Failed to clean up email data:', err);
        }
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
