import bundleAnalyzer from "@next/bundle-analyzer";
import createMDX from "fumadocs-mdx/config";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});
const withMDX = createMDX();

/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  // CSP is now set dynamically per-request in middleware.ts (nonce-based).
  // style-src still uses 'unsafe-inline' until Tailwind/Next.js support nonce-based style injection.
];

const nextConfig = {
  output: "standalone",
  assetPrefix: process.env.CDN_URL || undefined,
  transpilePackages: ["@apifold/ui", "@apifold/types"],
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withBundleAnalyzer(withMDX(nextConfig));
