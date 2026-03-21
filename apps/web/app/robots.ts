import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://apifold.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/docs"],
        disallow: ["/dashboard", "/api"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
