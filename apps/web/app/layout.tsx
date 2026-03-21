import "@apifold/ui/tokens/colors.css";
import "@apifold/ui/tokens/spacing.css";
import "@apifold/ui/tokens/typography.css";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://apifold.com";

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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  userScalable: true,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{let t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@350;400;500;600;700&family=Plus+Jakarta+Sans:wght@350;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Fallback font metrics for Plus Jakarta Sans and Inter */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @font-face {
                font-family: "Plus Jakarta Sans Fallback";
                src: local("Arial");
                size-adjust: 101.5%;
                ascent-override: 95%;
                descent-override: 25%;
                line-gap-override: 0%;
              }
              @font-face {
                font-family: "Inter Fallback";
                src: local("Arial");
                size-adjust: 107%;
                ascent-override: 90%;
                descent-override: 22%;
                line-gap-override: 0%;
              }
            `,
          }}
        />
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
