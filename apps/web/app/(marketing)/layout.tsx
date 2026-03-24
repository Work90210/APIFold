import type { ReactNode } from "react";
import Script from "next/script";
import { Navbar } from "./components/navbar";
import { Footer } from "./components/footer";
import { CookieConsent } from "@/components/analytics/cookie-consent";

export default function MarketingLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
        <Script
          defer
          data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      )}
      <Navbar />
      {children}
      <Footer />
      <CookieConsent />
    </div>
  );
}
