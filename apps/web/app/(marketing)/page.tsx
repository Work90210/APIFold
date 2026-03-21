import type { Metadata } from "next";
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

export default function LandingPage() {
  return (
    <>
      <Hero />
      <WorksWithBar />
      <FeaturesGrid />
      <HowItWorks />
      <SelfHostSection />
      <CtaBanner />
    </>
  );
}
