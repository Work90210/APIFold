import { NextResponse, type NextRequest } from 'next/server';
import { Webhook } from 'svix';

const CLERK_WEBHOOK_SECRET = process.env['CLERK_WEBHOOK_SECRET'];

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!CLERK_WEBHOOK_SECRET) {
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
  if (body.length > 1_048_576) {
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
    case 'user.created':
      // Future: initialize user settings
      break;
    case 'user.deleted':
      // Future: clean up user data
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
