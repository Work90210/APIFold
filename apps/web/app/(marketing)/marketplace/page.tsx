import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ListingCard } from '@/components/marketplace/listing-card';
import { FilterSidebar } from '@/components/marketplace/filter-sidebar';
import { SearchBar } from '@/components/marketplace/search-bar';
import { getReadDb } from '@/lib/db/index';
import { MarketplaceListingRepository } from '@/lib/db/repositories/marketplace-listing.repository';
import { MARKETPLACE_CATEGORIES } from '@/lib/marketplace/categories';
import { browseMarketplaceSchema } from '@/lib/validation/marketplace.schema';

export const metadata: Metadata = {
  title: 'Marketplace - APIFold',
  description: 'Discover and deploy pre-built MCP server integrations with one click.',
};

interface PageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sort?: string;
    page?: string;
    limit?: string;
  }>;
}

export default async function MarketplacePage({ searchParams }: PageProps) {
  const rawParams = await searchParams;

  let listings: readonly Record<string, unknown>[] = [];
  let featured: readonly Record<string, unknown>[] = [];
  let total = 0;
  let totalPages = 1;
  let categories: { slug: string; name: string; count: number }[] = [];

  try {
    const db = getReadDb();
    const listingRepo = new MarketplaceListingRepository(db);

    const params = browseMarketplaceSchema.parse(rawParams);
    const result = await listingRepo.searchPublished(params);

    listings = result.items;
    total = result.total;
    totalPages = result.totalPages;

    if (!rawParams.q && !rawParams.category && (!rawParams.page || rawParams.page === '1')) {
      featured = await listingRepo.findFeatured(4);
    }

    const counts = await listingRepo.findCategoriesWithCounts();
    categories = Object.values(MARKETPLACE_CATEGORIES).map((cat) => {
      const countEntry = counts.find((c) => c.category === cat.slug);
      return { slug: cat.slug, name: cat.name, count: countEntry?.count ?? 0 };
    });
  } catch (err) {
    console.error('[marketplace] Failed to load listings:', err);
  }

  const currentPage = parseInt(rawParams.page ?? '1', 10);
  const isFiltered = !!(rawParams.q || rawParams.category);

  return (
    <div className="mx-auto max-w-7xl px-6">
      {/* Compact header */}
      <div className="flex items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Marketplace
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pre-built MCP servers ready to deploy. {total > 0 ? `${total} integrations available.` : ''}
          </p>
        </div>
        <div className="w-80 shrink-0">
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
        </div>
      </div>

      {/* Featured row */}
      {featured.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
            Featured
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((listing) => (
              <ListingCard
                key={listing.slug as string}
                listing={listing as Parameters<typeof ListingCard>[0]['listing']}
              />
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      {featured.length > 0 && <div className="h-px bg-border/50 mb-8" />}

      {/* Main content */}
      <div className="flex gap-10">
        {/* Category sidebar */}
        <aside className="hidden w-48 shrink-0 md:block">
          <div className="sticky top-24">
            <Suspense fallback={null}>
              <FilterSidebar categories={categories} />
            </Suspense>
          </div>
        </aside>

        {/* Listing grid */}
        <div className="flex-1 pb-12">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {isFiltered ? `${total} results` : 'All integrations'}
            </h2>
            <SortDropdown currentSort={rawParams.sort} />
          </div>

          {listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-20 text-center">
              <p className="font-medium text-foreground">No integrations found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different search or category.
              </p>
              {isFiltered && (
                <Link
                  href="/marketplace"
                  className="mt-4 text-sm text-foreground underline underline-offset-4 hover:text-foreground/80"
                >
                  Clear filters
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.slug as string}
                  listing={listing as Parameters<typeof ListingCard>[0]['listing']}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/marketplace?${buildPageUrl(rawParams, currentPage - 1)}`}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Link>
              )}
              <span className="px-4 py-2 text-sm text-muted-foreground tabular-nums">
                {currentPage} / {totalPages}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={`/marketplace?${buildPageUrl(rawParams, currentPage + 1)}`}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildPageUrl(
  params: Record<string, string | undefined>,
  page: number,
): string {
  const urlParams = new URLSearchParams();
  if (params.q) urlParams.set('q', params.q);
  if (params.category) urlParams.set('category', params.category);
  if (params.sort) urlParams.set('sort', params.sort);
  urlParams.set('page', String(page));
  return urlParams.toString();
}

function SortDropdown({ currentSort }: { currentSort?: string }) {
  return (
    <select
      name="sort"
      defaultValue={currentSort ?? 'popular'}
      className="rounded-md border border-border bg-transparent px-2.5 py-1 text-xs text-muted-foreground focus:border-foreground focus:outline-none focus:text-foreground"
    >
      <option value="popular">Popular</option>
      <option value="newest">Newest</option>
      <option value="name">A-Z</option>
    </select>
  );
}
