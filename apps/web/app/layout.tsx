import "@apifold/ui/tokens/colors.css";
import "@apifold/ui/tokens/spacing.css";
import "@apifold/ui/tokens/typography.css";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Script from "next/script";
import { Providers } from "./providers";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://apifold.dev";

export const metadata: Metadata = {
  title: {
    default: "APIFold — Your API. Any AI agent. In 30 seconds.",
    template: "%s | APIFold",
  },
  description: "Turn any REST API into an MCP server. No code required. Open source.",
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: "website",
    siteName: "APIFold",
    title: "APIFold — Your API. Any AI agent. In 30 seconds.",
    description: "Turn any REST API into a live MCP server. No code. No SDK wrappers. Open source.",
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "APIFold — Your API. Any AI agent. In 30 seconds.",
    description: "Turn any REST API into a live MCP server. No code. No SDK wrappers. Open source.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  userScalable: true,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head>
        <Script src="/theme-init.js" strategy="beforeInteractive" nonce={nonce} />
      </head>
      <body className="antialiased safe-area-padding">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <Providers>
          <div id="main-content">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
