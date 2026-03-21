import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://apifold.com";

  const staticPages = [
    { url: baseUrl, priority: 1.0 },
    { url: `${baseUrl}/pricing`, priority: 0.9 },
    { url: `${baseUrl}/docs`, priority: 0.8 },
    { url: `${baseUrl}/docs/getting-started`, priority: 0.8 },
    { url: `${baseUrl}/docs/import-spec`, priority: 0.7 },
    { url: `${baseUrl}/docs/configure-server`, priority: 0.7 },
    { url: `${baseUrl}/docs/connect-claude`, priority: 0.7 },
    { url: `${baseUrl}/docs/connect-cursor`, priority: 0.7 },
    { url: `${baseUrl}/docs/api-reference`, priority: 0.7 },
    { url: `${baseUrl}/docs/dashboard-guide`, priority: 0.6 },
    { url: `${baseUrl}/docs/billing-and-plans`, priority: 0.6 },
    { url: `${baseUrl}/docs/authentication`, priority: 0.6 },
    { url: `${baseUrl}/docs/faq`, priority: 0.5 },
    { url: `${baseUrl}/docs/changelog`, priority: 0.4 },
  ];

  return staticPages.map((page) => ({
    url: page.url,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: page.priority,
  }));
}
