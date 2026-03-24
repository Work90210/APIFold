import { NextRequest } from 'next/server';

const POSTHOG_HOST = process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? 'https://us.i.posthog.com';

export async function POST(req: NextRequest) {
  const path = req.nextUrl.pathname.replace(/^\/ingest/, '');
  const search = req.nextUrl.search;
  const body = await req.text();

  const res = await fetch(`${POSTHOG_HOST}${path}${search}`, {
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
  const path = req.nextUrl.pathname.replace(/^\/ingest/, '');
  const search = req.nextUrl.search;

  const res = await fetch(`${POSTHOG_HOST}${path}${search}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  return new Response(res.body, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
  });
}
