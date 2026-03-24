'use client';

import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { initPostHog, getPostHog } from '@/lib/analytics/posthog-client';
import { trackPageView } from '@/lib/analytics/events.client';

function PostHogTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const identified = useRef(false);

  // Initialize PostHog + identify user in a single effect
  useEffect(() => {
    initPostHog();
    const ph = getPostHog();
    if (!ph) return;

    if (user && !identified.current) {
      // Identify with opaque user ID only — no PII (email, name) sent to PostHog
      ph.identify(user.id);

      // Super properties — attached to every event
      const plan = (user.publicMetadata?.plan as string) ?? 'free';
      ph.register({ plan });

      // Group analytics by plan tier
      ph.group('plan', plan, {
        name: plan.charAt(0).toUpperCase() + plan.slice(1),
      });

      identified.current = true;
    }

    if (!user && identified.current) {
      ph.reset();
      identified.current = false;
    }
  }, [user]);

  // Track page views on route change
  useEffect(() => {
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    trackPageView(url);
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <PostHogTracker />
      </Suspense>
      {children}
    </>
  );
}
