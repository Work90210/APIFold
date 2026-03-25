import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

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

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  if (userId && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Skip auth for public marketplace browse/detail/categories/featured/versions
  if (isPublicMarketplaceRoute(req) && req.method === 'GET') {
    return;
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
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
