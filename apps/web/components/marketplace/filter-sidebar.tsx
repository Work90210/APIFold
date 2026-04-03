'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { trackMarketplaceBrowse } from '@/lib/analytics/events.client';

import { CategoryIcon } from './category-icon';

interface CategoryWithCount {
  readonly slug: string;
  readonly name: string;
  readonly count: number;
}

interface FilterSidebarProps {
  readonly categories: readonly CategoryWithCount[];
}

export function FilterSidebar({ categories }: FilterSidebarProps) {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('category');

  const populated = categories.filter((c) => c.count > 0);
  const totalCount = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <nav className="space-y-0.5" aria-label="Categories">
      <Link
        href="/marketplace"
        className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors ${
          !activeCategory
            ? 'text-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <span>All</span>
        <span className="text-xs tabular-nums text-muted-foreground">{totalCount}</span>
      </Link>

      {populated.map((cat) => (
        <Link
          key={cat.slug}
          href={`/marketplace?category=${cat.slug}`}
          onClick={() => trackMarketplaceBrowse({ category: cat.slug, query: '', sort: '', resultCount: 0 })}
          className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
            activeCategory === cat.slug
              ? 'text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CategoryIcon category={cat.slug} className="h-3.5 w-3.5 shrink-0 opacity-50" />
          <span className="flex-1 truncate">{cat.name}</span>
          <span className="text-xs tabular-nums text-muted-foreground">{cat.count}</span>
        </Link>
      ))}
    </nav>
  );
}
