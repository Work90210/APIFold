"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/lib/hooks";
import { AlertTriangle, ArrowUpRight, Loader2 } from "lucide-react";

export function DangerZone() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const planId = (user?.publicMetadata?.plan as string) || "free";
  const stripeCustomerId = user?.publicMetadata?.stripeCustomerId as
    | string
    | undefined;

  const isPaid = planId !== "free" && planId !== "enterprise";

  if (!isPaid || !stripeCustomerId) return null;

  async function handleCancel() {
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
      toast({ title: "Failed to open cancellation portal", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/[0.02] p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-destructive mb-1">
            Danger Zone
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Cancel your subscription. You&apos;ll retain access to your current
            plan until the end of the billing period, then revert to the Free
            tier.
          </p>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 bg-card px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            {loading ? "Opening..." : "Cancel Subscription"}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
