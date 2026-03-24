'use client';

import { useEffect, useState } from 'react';
import { getPostHog } from '@/lib/analytics/posthog-client';
import { trackCookieConsent } from '@/lib/analytics/events';

const CONSENT_KEY = 'apifold_cookie_consent';

interface ConsentState {
  readonly analytics: boolean;
  readonly heatmaps: boolean;
  readonly sessionRecording: boolean;
  readonly timestamp: number;
}

function getStoredConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeConsent(consent: ConsentState): void {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  } catch {
    // Storage unavailable
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const existing = getStoredConsent();
    if (!existing) {
      // Small delay before showing the banner
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
    // Apply stored consent
    applyConsent(existing);
  }, []);

  const handleAcceptAll = () => {
    const consent: ConsentState = {
      analytics: true,
      heatmaps: true,
      sessionRecording: true,
      timestamp: Date.now(),
    };
    storeConsent(consent);
    applyConsent(consent);
    trackCookieConsent(consent);
    setVisible(false);
  };

  const handleAcceptNecessary = () => {
    const consent: ConsentState = {
      analytics: false,
      heatmaps: false,
      sessionRecording: false,
      timestamp: Date.now(),
    };
    storeConsent(consent);
    applyConsent(consent);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background p-4 md:p-0">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 md:flex-row md:items-center md:justify-between md:px-6 md:py-4">
        <p className="text-sm text-muted-foreground">
          We use cookies to understand how you use APIFold and improve your experience.
          No personal data is sold or shared with advertisers.
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={handleAcceptNecessary}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:border-foreground"
          >
            Necessary only
          </button>
          <button
            type="button"
            onClick={handleAcceptAll}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-all hover:bg-foreground/90 active:scale-[0.98]"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

function applyConsent(consent: ConsentState): void {
  const ph = getPostHog();
  if (!ph) return;

  if (consent.analytics) {
    ph.opt_in_capturing();
  } else {
    ph.opt_out_capturing();
  }

  if (consent.sessionRecording) {
    ph.startSessionRecording();
  }

  // Heatmaps are enabled via PostHog project settings + autocapture
  // The consent flag is tracked as a property for filtering
}
