import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

const TIERS = [
  {
    name: "Free",
    price: "€0",
    period: "/mo",
    description: "Perfect for hobby projects and prototypes.",
    features: [
      "2 MCP servers",
      "1,000 requests/mo",
      "7-day log retention",
      "Community support",
    ],
    cta: "Start Free",
    href: "/dashboard",
    highlight: false,
  },
  {
    name: "Starter",
    price: "€9",
    period: "/mo",
    description: "For growing apps and small teams.",
    features: [
      "10 MCP servers",
      "50,000 requests/mo",
      "30-day log retention",
      "Email support",
      "Overage: €0.50 / 10K req",
    ],
    cta: "Get Started",
    href: "/dashboard",
    highlight: true,
  },
  {
    name: "Pro",
    price: "€29",
    period: "/mo",
    description: "Scale your production workloads.",
    features: [
      "Unlimited servers",
      "500,000 requests/mo",
      "90-day log retention",
      "Priority support",
      "Overage: €0.50 / 10K req",
    ],
    cta: "Upgrade to Pro",
    href: "/dashboard",
    highlight: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Security, compliance, and dedicated support.",
    features: [
      "Custom request limits",
      "SSO & SAML",
      "99.99% SLA",
      "Dedicated support manager",
      "On-premise deployment",
    ],
    cta: "Contact Sales",
    href: "mailto:hello@apifold.com",
    highlight: false,
  },
] as const;

export function PricingCards() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {TIERS.map((tier) => (
        <div
          key={tier.name}
          className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-0.5 ${
            tier.highlight
              ? "border-[#645efb] bg-[#0f1930] shadow-[0_0_40px_-10px_rgba(100,94,251,0.3)]"
              : "border-[#40485d]/30 bg-[#0f1930]/60"
          }`}
        >
          {tier.highlight && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#645efb] to-[#a7a5ff] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              Most Popular
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-heading text-lg font-semibold text-white">
              {tier.name}
            </h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-heading text-4xl font-extrabold text-white">
                {tier.price}
              </span>
              {tier.period && (
                <span className="text-sm text-[#a3aac4]">{tier.period}</span>
              )}
            </div>
            <p className="mt-2 text-sm text-[#a3aac4]">{tier.description}</p>
          </div>

          <div className="mb-8 flex-1 space-y-3">
            {tier.features.map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-3 text-sm text-[#dee5ff]"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#a7a5ff]" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <Link
            href={tier.href}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#638bff] focus-visible:outline-none ${
              tier.highlight
                ? "bg-gradient-to-r from-[#645efb] to-[#a7a5ff] text-white hover:shadow-lg hover:shadow-[#a7a5ff]/20"
                : "border border-[#40485d] bg-[#0f1930] text-[#dee5ff] hover:border-[#a7a5ff]/30 hover:bg-[#141f38]"
            }`}
          >
            {tier.cta}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ))}
    </div>
  );
}
