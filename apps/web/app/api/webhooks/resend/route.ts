import { NextResponse, type NextRequest } from "next/server";
import { Webhook } from "svix";
import { getDb } from "@/lib/db";
import { emailEvents } from "@/lib/db/schema/email-events";
import { emailSuppressions } from "@/lib/db/schema/email-suppressions";

const RESEND_WEBHOOK_SECRET = process.env["RESEND_WEBHOOK_SECRET"];

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
    [key: string]: unknown;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!RESEND_WEBHOOK_SECRET) {
    console.error("[webhook] RESEND_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 },
    );
  }

  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 1_048_576) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const body = await request.text();

  if (Buffer.byteLength(body, 'utf8') > 1_048_576) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const wh = new Webhook(RESEND_WEBHOOK_SECRET);
  let event: ResendWebhookEvent;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ResendWebhookEvent;
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 },
    );
  }

  const eventTypeMap: Record<string, string> = {
    "email.sent": "sent",
    "email.delivered": "delivered",
    "email.bounced": "bounced",
    "email.complained": "complained",
    "email.opened": "opened",
    "email.clicked": "clicked",
  };

  const mappedType = eventTypeMap[event.type];
  if (!mappedType) {
    return NextResponse.json({ received: true });
  }

  const db = getDb();

  await db
    .insert(emailEvents)
    .values({
      provider: "resend",
      providerEventId: svixId,
      providerMessageId: event.data.email_id ?? null,
      eventType: mappedType as typeof emailEvents.$inferInsert.eventType,
      payload: event.data as Record<string, unknown>,
      occurredAt: new Date(event.created_at),
    })
    .onConflictDoNothing();

  if (
    (mappedType === "bounced" || mappedType === "complained") &&
    event.data.to
  ) {
    for (const recipient of event.data.to) {
      await db
        .insert(emailSuppressions)
        .values({
          email: recipient,
          reason:
            mappedType === "bounced" ? "hard_bounce" : "complaint",
          providerEventId: svixId,
        })
        .onConflictDoNothing();
    }
  }

  return NextResponse.json({ received: true });
}
