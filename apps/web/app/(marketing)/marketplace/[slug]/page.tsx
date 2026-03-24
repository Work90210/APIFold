import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Download, ExternalLink, ChevronRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { AuthorBadge } from '@/components/marketplace/author-badge';
import { CategoryIcon } from '@/components/marketplace/category-icon';
import { DeployButton } from '@/components/marketplace/deploy-button';
import { MARKETPLACE_CATEGORIES, type CategorySlug } from '@/lib/marketplace/categories';
import { getReadDb } from '@/lib/db/index';
import { MarketplaceListingRepository } from '@/lib/db/repositories/marketplace-listing.repository';
import { renderMarkdown } from '@/lib/marketplace/render-markdown';

const ICON_COLOR: Record<string, string> = {
  payments: 'text-violet-400',
  communication: 'text-sky-400',
  'developer-tools': 'text-emerald-400',
  productivity: 'text-amber-400',
  data: 'text-cyan-400',
  commerce: 'text-orange-400',
  'ai-ml': 'text-fuchsia-400',
  infrastructure: 'text-blue-400',
  crm: 'text-rose-400',
  monitoring: 'text-lime-400',
  other: 'text-zinc-400',
};

interface PageProps {
  params: Promise<{ slug: string }>;
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
    alternates: {
      canonical: `https://apifold.dev/marketplace/${slug}`,
    },
  };
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const listing = await getListing(slug);

  if (!listing) {
    notFound();
  }

  const categoryMeta = MARKETPLACE_CATEGORIES[listing.category as CategorySlug];
  const iconColor = ICON_COLOR[listing.category] ?? ICON_COLOR['other'];

  const descriptionHtml = renderMarkdown(listing.longDescription);
  const setupHtml = listing.setupGuide ? renderMarkdown(listing.setupGuide) : null;

  return (
    <div className="mx-auto max-w-5xl px-6 pb-16">
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
      <div className="mb-8 flex items-start justify-between gap-8">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted ${iconColor}`}>
            {listing.iconUrl ? (
              <img
                src={`/api/marketplace/icons/${listing.slug}`}
                alt=""
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <CategoryIcon category={listing.category} className="h-6 w-6" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{listing.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-lg">
              {listing.shortDescription}
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <AuthorBadge type={listing.authorType as 'official' | 'community' | 'verified'} />
              <span className="text-border">·</span>
              <span className="flex items-center gap-1">
                <Download className="h-3 w-3" />
                {listing.installCount.toLocaleString()} installs
              </span>
              <span className="text-border">·</span>
              <span>{listing.recommendedAuthMode === 'none' ? 'No auth required' : listing.recommendedAuthMode.replace('_', ' ')}</span>
              {listing.apiDocsUrl && (
                <>
                  <span className="text-border">·</span>
                  <a
                    href={listing.apiDocsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Docs <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 pt-1">
          <DeployButton slug={listing.slug} size="lg" />
        </div>
      </div>

      <div className="h-px bg-border/50 mb-8" />

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          <div
            className="prose prose-sm prose-invert max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-lg prose-h1:mb-3 prose-h2:text-base prose-h2:mt-8 prose-h2:mb-3 prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-ul:my-2 prose-ul:pl-4 prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 prose-a:decoration-border hover:prose-a:decoration-foreground prose-strong:text-foreground prose-code:text-foreground prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />

          {/* Tags */}
          {listing.tags.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border/40 flex flex-wrap items-center gap-2">
              {listing.tags.map((tag: string) => (
                <Link
                  key={tag}
                  href={`/marketplace?q=${tag}`}
                  className="rounded-md border border-border/50 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Setup Guide */}
          {setupHtml && (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Setup Guide
              </h3>
              <div
                className="prose prose-sm prose-invert max-w-none text-muted-foreground prose-ol:my-1 prose-ol:pl-4 prose-li:my-0.5 prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 prose-a:decoration-border hover:prose-a:decoration-foreground prose-p:text-muted-foreground prose-p:text-sm"
                dangerouslySetInnerHTML={{ __html: setupHtml }}
              />
            </div>
          )}

          {/* Details */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Details
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Category</dt>
                <dd className="flex items-center gap-1.5 text-foreground">
                  <CategoryIcon category={listing.category} className="h-3.5 w-3.5 text-muted-foreground" />
                  {categoryMeta?.name}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Auth</dt>
                <dd className="text-foreground">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {listing.recommendedAuthMode}
                  </code>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Spec</dt>
                <dd className="text-foreground text-xs tabular-nums">{listing.specVersion}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Added</dt>
                <dd className="flex items-center gap-1.5 text-foreground text-xs">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {new Date(listing.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
