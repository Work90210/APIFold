"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/lib/hooks";
import { CreditCard, ArrowUpRight, Loader2 } from "lucide-react";

export function BillingSection() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const stripeCustomerId = user?.publicMetadata?.stripeCustomerId as
    | string
    | undefined;

  if (!stripeCustomerId) return null;

  async function handleOpenPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const json = await res.json();
      if (json.success && json.data?.url) {
        window.location.href = json.data.url;
      }
    } catch {
      toast({ title: "Failed to open billing portal", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Billing
      </h2>

      <p className="text-sm text-muted-foreground mb-5">
        Update your payment method, view invoices, or change your subscription
        through the Stripe billing portal.
      </p>

      <button
        type="button"
        onClick={handleOpenPortal}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="h-4 w-4" />
        )}
        {loading ? "Opening..." : "Manage Billing & Invoices"}
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}
