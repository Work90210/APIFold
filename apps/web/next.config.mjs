import bundleAnalyzer from "@next/bundle-analyzer";
import createMDX from "fumadocs-mdx/config";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});
const withMDX = createMDX();

/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";
const clerkDomain = process.env.NEXT_PUBLIC_CLERK_DOMAIN || "*.clerk.accounts.dev";
const cdnUrl = process.env.CDN_URL || "";

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
  // CSP only in production — dev needs unsafe-eval for HMR + external Clerk scripts
  ...(!isDev
    ? [
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            `script-src 'self' 'unsafe-inline' https://${clerkDomain} https://plausible.io${cdnUrl ? ` ${cdnUrl}` : ""}`,
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            `img-src 'self' data: blob: https://img.clerk.com${cdnUrl ? ` ${cdnUrl}` : ""}`,
            "font-src 'self' https://fonts.gstatic.com",
            `connect-src 'self' https://${clerkDomain} https://api.clerk.com https://plausible.io`,
            "media-src 'none'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join("; "),
        },
      ]
    : []),
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
