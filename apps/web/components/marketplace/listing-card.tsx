import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { AuthorBadge } from './author-badge';
import { CategoryIcon } from './category-icon';

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

interface ListingCardProps {
  readonly listing: {
    readonly slug: string;
    readonly name: string;
    readonly shortDescription: string;
    readonly category: string;
    readonly tags: readonly string[];
    readonly iconUrl: string | null;
    readonly authorType: 'official' | 'community' | 'verified';
    readonly installCount: number;
    readonly createdAt: string;
  };
}

export function ListingCard({ listing }: ListingCardProps) {
  const iconColor = ICON_COLOR[listing.category] ?? ICON_COLOR['other'];

  return (
    <Link
      href={`/marketplace/${listing.slug}`}
      className="group flex flex-col rounded-lg border border-border/50 bg-card p-5 transition-all duration-150 hover:border-foreground/20 hover:bg-card/80"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${iconColor}`}>
          {listing.iconUrl ? (
            <img
              src={`/api/marketplace/icons/${listing.slug}`}
              alt=""
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <CategoryIcon category={listing.category} className="h-5 w-5" />
          )}
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground/0 transition-all duration-150 group-hover:text-muted-foreground" />
      </div>

      <h3 className="font-medium text-foreground mb-1">
        {listing.name}
      </h3>
      <p className="line-clamp-2 text-sm text-muted-foreground leading-relaxed mb-3">
        {listing.shortDescription}
      </p>

      <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground/70">
        <AuthorBadge type={listing.authorType} />
        {listing.installCount > 0 && (
          <>
            <span className="text-border">·</span>
            <span>{listing.installCount.toLocaleString()} installs</span>
          </>
        )}
      </div>
    </Link>
  );
}
