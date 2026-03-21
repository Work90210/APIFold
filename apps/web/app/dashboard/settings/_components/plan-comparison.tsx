"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { cn, Badge } from "@apifold/ui";
import { useToast } from "@/lib/hooks";
import {
  Check,
  Zap,
  Sparkles,
  Crown,
  Building2,
  ArrowRight,
  Loader2,
} from "lucide-react";

const TIERS = [
  {
    id: "free",
    name: "Free",
    price: "€0",
    period: "/mo",
    icon: Zap,
    features: [
      "2 MCP servers",
      "1,000 requests/mo",
      "7-day log retention",
      "Community support",
    ],
    cta: "Current Plan",
    checkoutable: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: "€9",
    period: "/mo",
    icon: Sparkles,
    popular: true,
    features: [
      "10 MCP servers",
      "50,000 requests/mo",
      "30-day log retention",
      "Email support",
      "Overage: €0.50 / 10K",
    ],
    cta: "Upgrade",
    checkoutable: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "€29",
    period: "/mo",
    icon: Crown,
    features: [
      "Unlimited servers",
      "500,000 requests/mo",
      "90-day log retention",
      "Priority support",
      "Overage: €0.50 / 10K",
    ],
    cta: "Upgrade",
    checkoutable: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    icon: Building2,
    features: [
      "Custom limits",
      "SSO & SAML",
      "99.99% SLA",
      "Dedicated support",
      "On-premise option",
    ],
    cta: "Contact Sales",
    checkoutable: false,
  },
] as const;

export function PlanComparison() {
  const { user } = useUser();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { toast } = useToast();

  const currentPlanId =
    (user?.publicMetadata?.plan as string) || "free";

  async function handleUpgrade(planId: string) {
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const json = await res.json();
      if (!json.success) {
        toast({ title: "Upgrade failed", description: json.error?.message ?? "Please try again.", variant: "destructive" });
        return;
      }
      if (json.success && json.data?.url) {
        window.location.href = json.data.url;
      }
    } catch {
      toast({ title: "Upgrade failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  }

  const currentTierIndex = TIERS.findIndex((t) => t.id === currentPlanId);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6">
        Compare Plans
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {TIERS.map((tier, index) => {
          const isCurrent = tier.id === currentPlanId;
          const isUpgrade = index > currentTierIndex;
          const isDowngrade = index < currentTierIndex;
          const TierIcon = tier.icon;

          return (
            <div
              key={tier.id}
              className={cn(
                "relative flex flex-col rounded-xl border p-5 transition-all duration-200",
                isCurrent
                  ? "border-primary ring-2 ring-primary/20 bg-primary/[0.03]"
                  : "border-border/60 hover:border-border",
              )}
            >
              {isCurrent && (
                <Badge
                  variant="default"
                  className="absolute -top-2.5 left-4 text-[10px]"
                >
                  Current
                </Badge>
              )}
              {"popular" in tier && tier.popular && !isCurrent && (
                <Badge
                  variant="info"
                  className="absolute -top-2.5 left-4 text-[10px]"
                >
                  Popular
                </Badge>
              )}

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <TierIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-heading font-semibold text-sm">
                    {tier.name}
                  </span>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-2xl font-bold font-heading">
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-xs text-muted-foreground">
                      {tier.period}
                    </span>
                  )}
                </div>
              </div>

              <ul className="flex-1 space-y-2.5 mb-5">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {isCurrent && (
                <div className="flex items-center justify-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
                  <Check className="h-3.5 w-3.5" />
                  Active
                </div>
              )}

              {isUpgrade && tier.checkoutable && (
                <button
                  type="button"
                  onClick={() => handleUpgrade(tier.id)}
                  disabled={loadingPlan !== null}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-foreground text-background px-3 py-2 text-xs font-medium transition-colors hover:bg-foreground/90 disabled:opacity-50"
                >
                  {loadingPlan === tier.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5" />
                  )}
                  {loadingPlan === tier.id ? "Redirecting..." : "Upgrade"}
                </button>
              )}

              {isUpgrade && !tier.checkoutable && tier.id === "enterprise" && (
                <a
                  href="mailto:hello@apifold.com"
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
                >
                  Contact Sales
                  <ArrowRight className="h-3 w-3" />
                </a>
              )}

              {isDowngrade && (
                <div className="flex items-center justify-center rounded-lg px-3 py-2 text-xs text-muted-foreground/50">
                  —
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
