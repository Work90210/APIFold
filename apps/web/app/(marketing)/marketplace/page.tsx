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
      featured = await listingRepo.findFeatured(3);
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
    <section className="relative border-t border-border px-6 py-28 md:py-36">
      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-xs font-medium tracking-wide text-muted-foreground">
            {total} pre-built integrations &mdash; deploy in one click
          </span>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Marketplace
          </h1>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted-foreground">
            Pre-configured MCP server templates for popular APIs. Deploy to your
            account, add your credentials, and connect any AI agent.
          </p>
          <div className="mx-auto mt-8 max-w-md">
            <Suspense fallback={null}>
              <SearchBar />
            </Suspense>
          </div>
        </div>

        {/* Featured */}
        {featured.length > 0 && (
          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {featured.map((listing) => (
              <ListingCard
                key={listing.slug as string}
                listing={listing as Parameters<typeof ListingCard>[0]['listing']}
              />
            ))}
          </div>
        )}

        {/* Browse section */}
        <div className="mt-20 flex gap-10">
          {/* Sidebar */}
          <aside className="hidden w-48 shrink-0 md:block">
            <div className="sticky top-24">
              <Suspense fallback={null}>
                <FilterSidebar categories={categories} />
              </Suspense>
            </div>
          </aside>

          {/* Grid */}
          <div className="flex-1">
            <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {isFiltered ? `${total} results` : 'All integrations'}
              </p>
              <SortDropdown currentSort={rawParams.sort} />
            </div>

            {listings.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-lg font-semibold tracking-tight text-foreground">No integrations found</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try a different search or category.
                </p>
                {isFiltered && (
                  <Link
                    href="/marketplace"
                    className="mt-6 inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-2 text-sm font-medium text-background transition-all duration-200 hover:bg-foreground/90 active:scale-[0.98]"
                  >
                    Clear filters
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              <div className="mt-12 flex items-center justify-center gap-3">
                {currentPage > 1 && (
                  <Link
                    href={`/marketplace?${buildPageUrl(rawParams, currentPage - 1)}`}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Link>
                )}
                <span className="text-sm tabular-nums text-muted-foreground">
                  {currentPage} / {totalPages}
                </span>
                {currentPage < totalPages && (
                  <Link
                    href={`/marketplace?${buildPageUrl(rawParams, currentPage + 1)}`}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function buildPageUrl(params: Record<string, string | undefined>, page: number): string {
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
      className="rounded-md border border-border bg-transparent px-3 py-1.5 text-xs text-muted-foreground focus:border-foreground focus:outline-none"
    >
      <option value="popular">Popular</option>
      <option value="newest">Newest</option>
      <option value="name">A–Z</option>
    </select>
  );
}
