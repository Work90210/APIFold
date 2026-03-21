import { NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  handleWebhookEvent,
} from "@/lib/billing/webhook-handler";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 },
      );
    }

    const event = verifyWebhookSignature(body, signature);
    await handleWebhookEvent(event);

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[webhook] Processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 400 },
    );
  }
}
