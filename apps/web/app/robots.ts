import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://apifold.dev";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/docs", "/marketplace"],
        disallow: ["/dashboard", "/api", "/ingest"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
