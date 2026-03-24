import posthog from 'posthog-js';

let initialized = false;

export function initPostHog(): void {
  if (initialized || typeof window === 'undefined') return;

  const key = process.env['NEXT_PUBLIC_POSTHOG_KEY'];
  if (!key) return;

  posthog.init(key, {
    api_host: '/ingest',
    ui_host: process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? 'https://us.i.posthog.com',

    person_profiles: 'identified_only',

    // GDPR: opt out by default — only capture after explicit cookie consent
    opt_out_capturing_by_default: true,

    // Page tracking — manual via provider
    capture_pageview: false,
    capture_pageleave: true,

    // Autocapture for heatmaps — with safe masking defaults
    autocapture: true,
    mask_all_text: true,
    mask_all_element_attributes: false,

    // Heatmaps
    enable_heatmaps: true,

    // Session recording — disabled until cookie consent
    disable_session_recording: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*',
      recordCrossOriginIframes: false,
      recordHeaders: false,
      recordBody: false,
    },

    // Error tracking
    capture_exceptions: true,

    // Privacy
    persistence: 'localStorage+cookie',
    respect_dnt: true,

    // Performance
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
