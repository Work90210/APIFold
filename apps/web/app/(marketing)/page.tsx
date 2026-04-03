import type { Metadata } from "next";
import { headers } from "next/headers";
import { Hero } from "./components/hero";
import { WorksWithBar } from "./components/works-with-bar";
import { FeaturesGrid } from "./components/features-grid";
import { HowItWorks } from "./components/how-it-works";
import { SelfHostSection } from "./components/self-host-section";
import { CtaBanner } from "./components/cta-banner";

export const metadata: Metadata = {
  title: "APIFold — Your API. Any AI agent. In 30 seconds.",
  description:
    "Turn any REST API into a live MCP server. No code. No SDK wrappers. Open source.",
  openGraph: {
    title: "APIFold — Your API. Any AI agent. In 30 seconds.",
    description:
      "Turn any REST API into a live MCP server. No code. No SDK wrappers. Open source.",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "APIFold",
  url: "https://apifold.dev",
  logo: "https://apifold.dev/logo.svg",
  description:
    "Turn any REST API into an MCP server. No code required. Open source.",
  sameAs: [
    "https://github.com/Work90210/APIFold",
    "https://www.producthunt.com/products/apifold",
  ],
};

const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "APIFold",
  url: "https://apifold.dev",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://apifold.dev/marketplace?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

export default async function LandingPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema).replace(
            /<\/script/gi,
            "<\\/script"
          ),
        }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webSiteSchema).replace(
            /<\/script/gi,
            "<\\/script"
          ),
        }}
      />
      <Hero />
      <WorksWithBar />
      <FeaturesGrid />
      <HowItWorks />
      <SelfHostSection />
      <CtaBanner />
    </>
  );
}
