import { ChevronRight, ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CategoryIcon } from '@/components/marketplace/category-icon';
import { DeployButton } from '@/components/marketplace/deploy-button';
import { ListingTabs } from '@/components/marketplace/listing-tabs';
import { MarkdownContent } from '@/components/marketplace/markdown-content';
import { VersionSelector } from '@/components/marketplace/version-selector';
import { getReadDb } from '@/lib/db/index';
import { MarketplaceListingRepository } from '@/lib/db/repositories/marketplace-listing.repository';
import { MarketplaceVersionRepository } from '@/lib/db/repositories/marketplace-version.repository';
import { MARKETPLACE_CATEGORIES, type CategorySlug } from '@/lib/marketplace/categories';
import { renderMarkdown } from '@/lib/marketplace/render-markdown';

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

  // Fetch versions for the changelog tab
  let versions: readonly { readonly id: string; readonly version: string; readonly changelog: string | null; readonly toolCount: number; readonly createdAt: Date }[] = [];
  try {
    const db = getReadDb();
    const versionRepo = new MarketplaceVersionRepository(db);
    versions = await versionRepo.findByListing(listing.id);
  } catch {
    // Versions table may not exist yet
  }

  return (
    <section className="relative px-6 py-16">
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

        {/* Version selector + Tabs */}
        <div className="mt-10 flex items-center justify-between border-b border-border">
          <ListingTabs slug={listing.slug} activeTab={activeTab} />

          {/* Version selector */}
          <div className="pb-1">
            <VersionSelector slug={listing.slug} currentVersion={listing.specVersion} />
          </div>
        </div>

        {/* Tab content */}
        <div className="mt-8">
          {activeTab === 'overview' && (
            <div className="grid gap-10 lg:grid-cols-3">
              {/* Main content */}
              <div className="lg:col-span-2">
                <MarkdownContent html={descriptionHtml} />

                {listing.tags.length > 0 && (
                  <div className="mt-8 flex flex-wrap gap-2 border-t border-border/50 pt-6">
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
                    <MarkdownContent html={setupHtml} />
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
                  OpenAPI Specification
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  v{listing.specVersion}
                </span>
              </div>
              <pre className="max-h-[600px] overflow-auto p-4 text-xs leading-relaxed text-muted-foreground font-mono">
                <code>{JSON.stringify(listing.rawSpec, null, 2)}</code>
              </pre>
            </div>
          )}

          {activeTab === 'changelog' && (
            <div>
              {versions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-16 text-center">
                  <p className="text-sm font-medium text-foreground">No version history yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Changelogs will appear here when the publisher releases updates.
                  </p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline */}
                  {versions.map((v, i) => (
                    <div key={v.id} className="relative flex gap-6 pb-8 last:pb-0">
                      {/* Timeline line */}
                      {i < versions.length - 1 && (
                        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
                      )}

                      {/* Dot */}
                      <div className="relative z-10 mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center">
                        <div className={`h-2.5 w-2.5 rounded-full ${i === 0 ? 'bg-foreground' : 'bg-border'}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-medium text-foreground">
                            v{v.version}
                          </span>
                          {i === 0 && (
                            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              latest
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {v.toolCount} tools
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(v.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        {v.changelog ? (
                          <div className="mt-2">
                            <MarkdownContent html={renderMarkdown(v.changelog)} />
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Initial release
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
