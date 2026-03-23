import type { Metadata } from "next";
import { PricingCards } from "../components/pricing-cards";
import { Faq } from "../components/faq";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing. Start for free, scale as you grow.",
  openGraph: {
    title: "Pricing — APIFold",
    description:
      "Simple, transparent pricing for MCP servers. Start for free, scale as you grow.",
  },
};

export default function PricingPage() {
  return (
    <div className="px-6 pt-32 pb-28">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-16 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Pricing
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Start for free, scale as you grow. No hidden fees or surprise
            charges.
          </p>
        </div>

        {/* Cards */}
        <PricingCards />

        {/* FAQ */}
        <div className="mx-auto mt-28 max-w-3xl">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              FAQ
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground">
              Frequently asked questions
            </h2>
          </div>
          <Faq />
        </div>
      </div>
    </div>
  );
}
