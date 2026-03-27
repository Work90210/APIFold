'use client';

import { useEffect, useState } from 'react';

import { trackCookieConsent } from '@/lib/analytics/events.client';
import { getPostHog } from '@/lib/analytics/posthog-client';

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

function applyConsent(consent: ConsentState): void {
  const ph = getPostHog();
  if (!ph) return;

  if (consent.analytics && consent.sessionRecording) {
    ph.startSessionRecording();
  }

  if (consent.analytics && consent.heatmaps) {
    ph.set_config({ enable_heatmaps: true });
  }

  if (!consent.analytics) {
    ph.opt_out_capturing();
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const existing = getStoredConsent();
    if (!existing) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
    applyConsent(existing);
  }, []);

  const accept = (full: boolean) => {
    const consent: ConsentState = {
      analytics: full,
      heatmaps: full,
      sessionRecording: full,
      timestamp: Date.now(),
    };
    storeConsent(consent);
    applyConsent(consent);
    if (full) trackCookieConsent(consent);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          We use anonymous analytics to improve APIFold. Accept all to also enable
          session recordings and heatmaps for a better experience.
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => accept(false)}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:border-foreground"
          >
            Necessary only
          </button>
          <button
            type="button"
            onClick={() => accept(true)}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-all hover:bg-foreground/90 active:scale-[0.98]"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
