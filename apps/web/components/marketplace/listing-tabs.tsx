'use client';

import Link from 'next/link';

import { trackTabChange } from '@/lib/analytics/events.client';

interface ListingTabsProps {
  readonly slug: string;
  readonly activeTab: string;
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'spec', label: 'Spec' },
  { id: 'changelog', label: 'Changelog' },
] as const;

export function ListingTabs({ slug, activeTab }: ListingTabsProps) {
  return (
    <nav className="flex gap-0" aria-label="Listing tabs">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const href = tab.id === 'overview'
          ? `/marketplace/${slug}`
          : `/marketplace/${slug}?tab=${tab.id}`;

        return (
          <Link
            key={tab.id}
            href={href}
            onClick={() => trackTabChange({ slug, tab: tab.id })}
            className={`relative px-4 py-3 text-sm transition-colors duration-150 ${
              isActive
                ? 'font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute inset-x-0 bottom-0 h-[2px] bg-foreground" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
