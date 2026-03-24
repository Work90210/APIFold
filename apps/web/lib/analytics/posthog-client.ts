import posthog from 'posthog-js';

let initialized = false;

export function initPostHog(): void {
  if (initialized || typeof window === 'undefined') return;

  const key = process.env['NEXT_PUBLIC_POSTHOG_KEY'];
  const host = process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? 'https://us.i.posthog.com';

  if (!key) return;

  posthog.init(key, {
    api_host: host,
    person_profiles: 'identified_only',
    capture_pageview: false,  // We handle this manually in the provider
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    respect_dnt: true,
    autocapture: false,       // We use explicit event tracking
    disable_session_recording: true, // Enabled only after cookie consent

    loaded: (ph) => {
      // Disable in development unless explicitly enabled
      if (process.env.NODE_ENV === 'development' && !process.env['NEXT_PUBLIC_POSTHOG_DEV']) {
        ph.opt_out_capturing();
      }
    },
  });

  initialized = true;
}

export function getPostHog() {
  if (typeof window === 'undefined') return null;
  return posthog;
}
