'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { initPostHog, getPostHog } from '@/lib/analytics/posthog-client';
import { trackPageView } from '@/lib/analytics/events';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const identified = useRef(false);

  // Initialize PostHog on mount
  useEffect(() => {
    initPostHog();
  }, []);

  // Track page views
  useEffect(() => {
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    trackPageView(url);
  }, [pathname, searchParams]);

  // Identify user when signed in
  useEffect(() => {
    if (user && !identified.current) {
      const ph = getPostHog();
      if (ph) {
        ph.identify(user.id, {
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName,
          created_at: user.createdAt,
        });
        identified.current = true;
      }
    }

    if (!user && identified.current) {
      getPostHog()?.reset();
      identified.current = false;
    }
  }, [user]);

  return <>{children}</>;
}
