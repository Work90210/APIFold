import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public marketplace API routes — no auth required
const isPublicMarketplaceRoute = createRouteMatcher([
  '/api/marketplace',
  '/api/marketplace/categories',
  '/api/marketplace/featured',
  '/api/marketplace/:slug',
  '/api/marketplace/:slug/versions',
]);

const isProtectedRoute = createRouteMatcher([
  '/api/((?!health|webhooks|cron|email/unsubscribe).*)',
  '/dashboard(.*)',
]);

const isDev = process.env.NODE_ENV === 'development';
const clerkDomain =
  process.env.NEXT_PUBLIC_CLERK_DOMAIN || '*.clerk.accounts.dev';
const cdnUrl = process.env.CDN_URL || '';

function buildCspHeader(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://${clerkDomain} https://challenges.cloudflare.com https://plausible.io https://eu.i.posthog.com${cdnUrl ? ` ${cdnUrl}` : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src 'self' data: blob: https://img.clerk.com${cdnUrl ? ` ${cdnUrl}` : ''}`,
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src 'self' https://${clerkDomain} https://api.clerk.com https://challenges.cloudflare.com https://plausible.io https://eu.i.posthog.com https://apifold-runtime.fly.dev`,
    `frame-src https://challenges.cloudflare.com https://${clerkDomain}`,
    "media-src 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

function applyNonce(req: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', buildCspHeader(nonce));
  return response;
}

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Redirect authenticated users from / to /dashboard
  if (userId && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Skip auth for public marketplace browse/detail/categories/featured/versions
  if (isPublicMarketplaceRoute(req) && req.method === 'GET') {
    return isDev ? undefined : applyNonce(req);
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Apply nonce-based CSP in production
  if (!isDev) {
    return applyNonce(req);
  }
});

export const config = {
  matcher: [
    '/',
    '/api/((?!health|webhooks|cron|email/unsubscribe).*)',
    '/dashboard(.*)',
    '/sign-in(.*)',
    '/sign-up(.*)',
  ],
};
