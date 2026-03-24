import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CategoryIcon } from './category-icon';

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
  return (
    <Link
      href={`/marketplace/${listing.slug}`}
      className="group rounded-lg border border-border p-6 transition-all duration-300 hover:-translate-y-0.5"
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-border">
        {listing.iconUrl ? (
          <img
            src={`/api/marketplace/icons/${listing.slug}`}
            alt=""
            className="h-10 w-10 rounded-lg object-cover"
          />
        ) : (
          <CategoryIcon category={listing.category} className="h-5 w-5 text-foreground" />
        )}
      </div>

      <h3 className="text-lg font-semibold tracking-tight text-foreground">
        {listing.name}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {listing.shortDescription}
      </p>

      {listing.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {listing.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {listing.installCount > 0
            ? `${listing.installCount.toLocaleString()} installs`
            : listing.authorType === 'official' ? 'Official' : listing.authorType}
        </span>
        <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 text-foreground">
          View <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}
