'use client';

import { useEffect } from 'react';
import { trackMarketplaceListingView } from '@/lib/analytics/events.client';

interface TrackListingViewProps {
  readonly slug: string;
  readonly name: string;
  readonly category: string;
}

export function TrackListingView({ slug, name, category }: TrackListingViewProps) {
  useEffect(() => {
    trackMarketplaceListingView({ slug, name, category, tab: 'overview' });
  }, [slug, name, category]);

  return null;
}
