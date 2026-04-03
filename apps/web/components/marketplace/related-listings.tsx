import { ListingCard } from './listing-card';

interface RelatedListingsProps {
  readonly listings: readonly {
    readonly slug: string;
    readonly name: string;
    readonly shortDescription: string;
    readonly category: string;
    readonly tags: readonly string[];
    readonly iconUrl: string | null;
    readonly authorType: 'official' | 'community' | 'verified';
    readonly installCount: number;
    readonly createdAt: string;
  }[];
}

export function RelatedListings({ listings }: RelatedListingsProps) {
  if (listings.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 border-t border-border pt-12">
      <h2 className="mb-8 text-xl font-extrabold tracking-tighter text-foreground">
        Related Integrations
      </h2>
      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
        {listings.map((listing) => (
          <ListingCard key={listing.slug} listing={listing} />
        ))}
      </div>
    </section>
  );
}
