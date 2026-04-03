import type { MetadataRoute } from "next";

import { getReadDb } from "@/lib/db/index";
import { MarketplaceListingRepository } from "@/lib/db/repositories/marketplace-listing.repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://apifold.dev";

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, priority: 1.0, changeFrequency: "weekly", lastModified: new Date() },
    { url: `${baseUrl}/pricing`, priority: 0.9, changeFrequency: "monthly", lastModified: new Date() },
    { url: `${baseUrl}/marketplace`, priority: 0.9, changeFrequency: "daily", lastModified: new Date() },
    { url: `${baseUrl}/docs`, priority: 0.8, changeFrequency: "weekly", lastModified: new Date() },
    { url: `${baseUrl}/docs/getting-started`, priority: 0.8, changeFrequency: "monthly", lastModified: new Date() },
    { url: `${baseUrl}/docs/import-spec`, priority: 0.7, changeFrequency: "monthly", lastModified: new Date() },
    { url: `${baseUrl}/docs/configure-server`, priority: 0.7, changeFrequency: "monthly", lastModified: new Date() },
    { url: `${baseUrl}/docs/connect-claude`, priority: 0.7, changeFrequency: "monthly", lastModified: new Date() },
    { url: `${baseUrl}/docs/connect-cursor`, priority: 0.7, changeFrequency: "monthly", lastModified: new Date() },
    { url: `${baseUrl}/docs/api-reference`, priority: 0.7, changeFrequency: "monthly", lastModified: new Date() },
    { url: `${baseUrl}/docs/dashboard-guide`, priority: 0.6, changeFrequency: "monthly", lastModified: new Date() },
    { url: `${baseUrl}/docs/billing-and-plans`, priority: 0.6, changeFrequency: "monthly", lastModified: new Date() },
    { url: `${baseUrl}/docs/authentication`, priority: 0.6, changeFrequency: "monthly", lastModified: new Date() },
    { url: `${baseUrl}/docs/faq`, priority: 0.5, changeFrequency: "monthly", lastModified: new Date() },
    { url: `${baseUrl}/docs/changelog`, priority: 0.4, changeFrequency: "weekly", lastModified: new Date() },
  ];

  // Add all published marketplace listing URLs
  try {
    const db = getReadDb();
    const repo = new MarketplaceListingRepository(db);
    const result = await repo.searchPublished({ sort: 'newest', page: 1, limit: 10_000 });
    const listingPages: MetadataRoute.Sitemap = result.items.map((listing) => ({
      url: `${baseUrl}/marketplace/${listing.slug}`,
      lastModified: listing.updatedAt,
      changeFrequency: "weekly" as const,
      priority: listing.featured ? 0.8 : 0.6,
    }));
    return [...staticPages, ...listingPages];
  } catch {
    return staticPages;
  }
}
