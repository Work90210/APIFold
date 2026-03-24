import posthog from 'posthog-js';

let initialized = false;

export function initPostHog(): void {
  if (initialized || typeof window === 'undefined') return;

  const key = process.env['NEXT_PUBLIC_POSTHOG_KEY'];
  if (!key) return;

  posthog.init(key, {
    // Route through our reverse proxy to avoid ad blockers
    api_host: '/ingest',
    ui_host: process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? 'https://us.i.posthog.com',

    // Identity
    person_profiles: 'identified_only',

    // Page tracking — manual via provider
    capture_pageview: false,
    capture_pageleave: true,

    // Autocapture — needed for heatmaps and toolbar
    autocapture: true,

    // Heatmaps
    enable_heatmaps: true,

    // Session recording — starts disabled, enabled after cookie consent
    disable_session_recording: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '[data-ph-mask]',
      recordCrossOriginIframes: false,
      // Capture network requests for debugging (strip auth headers)
      recordHeaders: false,
      recordBody: false,
    },

    // Error tracking
    capture_exceptions: true,

    // Privacy
    persistence: 'localStorage+cookie',
    respect_dnt: true,
    mask_all_text: false,
    mask_all_element_attributes: false,

    // Performance
    request_batching: true,

    // Toolbar — enable for visual element selection
    advanced_disable_toolbar_metrics: false,

    // Surveys
    enable_recording_console_log: true,

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

export { posthog };
