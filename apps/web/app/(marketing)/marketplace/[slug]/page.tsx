import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowRight, ChevronRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { CategoryIcon } from '@/components/marketplace/category-icon';
import { DeployButton } from '@/components/marketplace/deploy-button';
import { MARKETPLACE_CATEGORIES, type CategorySlug } from '@/lib/marketplace/categories';
import { getReadDb } from '@/lib/db/index';
import { MarketplaceListingRepository } from '@/lib/db/repositories/marketplace-listing.repository';
import { renderMarkdown } from '@/lib/marketplace/render-markdown';
import { ListingTabs } from '@/components/marketplace/listing-tabs';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}

async function getListing(slug: string) {
  try {
    const db = getReadDb();
    const repo = new MarketplaceListingRepository(db);
    return await repo.findPublishedBySlug(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing) return { title: 'Not Found - APIFold Marketplace' };

  return {
    title: `${listing.name} MCP Server - APIFold Marketplace`,
    description: listing.shortDescription,
    openGraph: {
      title: `${listing.name} MCP Server - APIFold Marketplace`,
      description: listing.shortDescription,
      url: `https://apifold.dev/marketplace/${slug}`,
    },
    alternates: { canonical: `https://apifold.dev/marketplace/${slug}` },
  };
}

export default async function ListingDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const listing = await getListing(slug);

  if (!listing) {
    notFound();
  }

  const categoryMeta = MARKETPLACE_CATEGORIES[listing.category as CategorySlug];
  const descriptionHtml = renderMarkdown(listing.longDescription);
  const setupHtml = listing.setupGuide ? renderMarkdown(listing.setupGuide) : null;
  const activeTab = tab ?? 'overview';

  return (
    <section className="relative border-t border-border px-6 py-16">
      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Breadcrumbs */}
        <nav className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/marketplace" className="hover:text-foreground transition-colors">
            Marketplace
          </Link>
          {categoryMeta && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Link
                href={`/marketplace?category=${listing.category}`}
                className="hover:text-foreground transition-colors"
              >
                {categoryMeta.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{listing.name}</span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border">
              {listing.iconUrl ? (
                <img
                  src={listing.iconUrl}
                  alt=""
                  className="h-8 w-8 rounded"
                />
              ) : (
                <CategoryIcon category={listing.category} className="h-7 w-7 text-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tighter text-foreground sm:text-3xl">
                {listing.name}
              </h1>
              <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">
                {listing.shortDescription}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  listing.authorType === 'official' ? 'OFFICIAL' : listing.authorType.toUpperCase(),
                  listing.recommendedAuthMode === 'none' ? 'NO AUTH' : listing.recommendedAuthMode.replace('_', ' ').toUpperCase(),
                  `v${listing.specVersion}`,
                  `${listing.installCount} INSTALLS`,
                ].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {listing.apiDocsUrl && (
              <a
                href={listing.apiDocsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm text-muted-foreground transition-colors hover:text-foreground hover:border-foreground"
              >
                API Docs <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <DeployButton slug={listing.slug} size="lg" />
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-10">
          <ListingTabs slug={listing.slug} activeTab={activeTab} />
        </div>

        {/* Tab content */}
        <div className="mt-8">
          {activeTab === 'overview' && (
            <div className="grid gap-10 lg:grid-cols-3">
              {/* Main content */}
              <div className="lg:col-span-2">
                <div
                  className="prose prose-sm prose-invert max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-xl prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-3 prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-ul:my-2 prose-ul:pl-5 prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 prose-a:decoration-border hover:prose-a:decoration-foreground prose-strong:text-foreground prose-code:text-foreground prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-normal prose-code:before:content-none prose-code:after:content-none"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />

                {listing.tags.length > 0 && (
                  <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-6">
                    {listing.tags.map((tag: string) => (
                      <Link
                        key={tag}
                        href={`/marketplace?q=${tag}`}
                        className="rounded-full border border-border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground hover:border-foreground"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-8">
                {setupHtml && (
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Setup Guide
                    </h3>
                    <div
                      className="prose prose-sm prose-invert max-w-none text-muted-foreground prose-ol:my-1 prose-ol:pl-4 prose-li:my-0.5 prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 prose-a:decoration-border hover:prose-a:decoration-foreground prose-p:text-sm"
                      dangerouslySetInnerHTML={{ __html: setupHtml }}
                    />
                  </div>
                )}

                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Details
                  </h3>
                  <dl className="space-y-3 text-sm">
                    {[
                      ['Category', categoryMeta?.name ?? listing.category],
                      ['Auth Mode', listing.recommendedAuthMode],
                      ['Spec Version', listing.specVersion],
                      ['Added', new Date(listing.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="font-mono text-xs text-foreground">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'spec' && (
            <div className="rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  OpenAPI Spec
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {listing.specVersion}
                </span>
              </div>
              <pre className="max-h-[600px] overflow-auto p-4 text-xs leading-relaxed text-muted-foreground">
                <code>{JSON.stringify(listing.rawSpec, null, 2)}</code>
              </pre>
            </div>
          )}

          {activeTab === 'changelog' && (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No version history yet. Changelogs will appear here when the publisher releases updates.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
