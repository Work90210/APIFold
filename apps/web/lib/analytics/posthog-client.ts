import posthog from 'posthog-js';

let initialized = false;

export function initPostHog(): void {
  if (initialized || typeof window === 'undefined') return;

  const key = process.env['NEXT_PUBLIC_POSTHOG_KEY'];
  if (!key) return;

  posthog.init(key, {
    api_host: '/ingest',
    ui_host: process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? 'https://eu.i.posthog.com',

    person_profiles: 'identified_only',

    // Anonymous analytics (pageviews, feature usage) are captured by default.
    // Session recording and heatmaps require explicit cookie consent.
    opt_out_capturing_by_default: false,

    capture_pageview: false,
    capture_pageleave: true,

    autocapture: true,
    mask_all_text: true,
    mask_all_element_attributes: false,

    enable_heatmaps: false,

    disable_session_recording: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*',
      recordCrossOriginIframes: false,
      recordHeaders: false,
      recordBody: false,
    },

    capture_exceptions: true,

    persistence: 'localStorage+cookie',
    respect_dnt: true,

    request_batching: true,

    loaded: (ph) => {
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

export { posthog };
