import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

const POSTHOG_HOST = process.env['POSTHOG_HOST'] ?? process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? 'https://eu.i.posthog.com';
const MAX_BODY_BYTES = 512 * 1024;

// Only allow paths the PostHog JS SDK actually uses
const ALLOWED_PATHS = new Set([
  '/e/',
  '/e',
  '/decide/',
  '/decide',
  '/engage/',
  '/engage',
  '/batch/',
  '/batch',
  '/s/',
  '/s',
]);

function isAllowedPath(path: string): boolean {
  if (ALLOWED_PATHS.has(path)) return true;
  if (path.startsWith('/static/')) return true;
  return false;
}

export async function POST(req: NextRequest) {
  const rawPath = req.nextUrl.pathname.replace(/^\/ingest/, '') || '/';

  // Normalize to prevent traversal
  const normalized = new URL(rawPath, 'http://localhost').pathname;
  if (!isAllowedPath(normalized)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Body size cap
  const contentLength = Number(req.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const body = await req.text();
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const res = await fetch(`${POSTHOG_HOST}${normalized}${req.nextUrl.search}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  return new Response(res.body, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
  });
}

export async function GET(req: NextRequest) {
  const rawPath = req.nextUrl.pathname.replace(/^\/ingest/, '') || '/';
  const normalized = new URL(rawPath, 'http://localhost').pathname;

  if (!isAllowedPath(normalized) && !normalized.startsWith('/static/')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const res = await fetch(`${POSTHOG_HOST}${normalized}${req.nextUrl.search}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  return new Response(res.body, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
  });
}
