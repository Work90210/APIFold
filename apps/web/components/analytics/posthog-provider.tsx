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

  // Initialize PostHog on mount
  useEffect(() => {
    initPostHog();
  }, []);

  // Track page views on route change
  useEffect(() => {
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    trackPageView(url);
  }, [pathname, searchParams]);

  // Identify user + set super properties + group analytics
  useEffect(() => {
    const ph = getPostHog();
    if (!ph) return;

    if (user && !identified.current) {
      // Identify the user
      ph.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
        created_at: user.createdAt,
      });

      // Super properties — attached to every event automatically
      const plan = (user.publicMetadata?.plan as string) ?? 'free';
      const isAdmin = user.publicMetadata?.is_admin === true;
      ph.register({
        plan,
        is_admin: isAdmin,
        user_created_at: user.createdAt,
      });

      // Group analytics — group by plan tier
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
