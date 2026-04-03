import Script from "next/script";
import type { ReactNode } from "react";
import { headers } from "next/headers";

import { Footer } from "./components/footer";
import { Navbar } from "./components/navbar";

// CookieConsent moved to root Providers — visible on all pages, not just marketing

export default async function MarketingLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
        <Script
          defer
          data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
          nonce={nonce}
        />
      )}
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
