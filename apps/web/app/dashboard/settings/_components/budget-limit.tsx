"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/lib/hooks";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { ShieldCheck, Loader2 } from "lucide-react";

export function BudgetLimit() {
  const { user } = useUser();
  const { toast } = useToast();
  const [capEur, setCapEur] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const planId = ((user?.publicMetadata?.plan as string) || "free") as PlanId;
  const plan = PLANS[planId] ?? PLANS.free;
  const isPaid = planId !== "free" && planId !== "enterprise";

  useEffect(() => {
    if (!isPaid) return;
    fetch("/api/billing/budget")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.capEur !== null) {
          setCapEur(String(data.data.capEur));
        }
      })
      .catch(() => {
        toast({
          title: "Failed to load spending limit",
          variant: "destructive",
        });
      });
  }, [isPaid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isPaid) return null;

  async function handleSave() {
    setLoading(true);
    setSaved(false);
    try {
      const raw = capEur.trim() === "" ? null : parseFloat(capEur);
      if (raw !== null && !Number.isFinite(raw)) {
        toast({
          title: "Please enter a valid number",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const res = await fetch("/api/billing/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capEur: raw }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        toast({
          title:
            raw === null
              ? "Budget limit removed"
              : `Budget limit set to €${raw}`,
          description:
            raw === null
              ? "Overage charges are uncapped."
              : "Tool executions will stop when this limit is reached.",
          variant: "success",
        });
        setTimeout(() => setSaved(false), 3000);
      } else {
        toast({
          title: "Invalid budget value",
          description: data.error?.message ?? "Please check your input.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Failed to update budget limit",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Spending Limit
        </h2>
      </div>

      <p className="text-sm text-muted-foreground mb-5">
        Set a monthly overage spending cap. When reached, additional tool
        executions will be blocked until the next billing cycle. Leave empty for
        no limit.
      </p>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            &euro;
          </span>
          <input
            type="number"
            min="0"
            max="10000"
            step="1"
            placeholder="No limit"
            value={capEur}
            onChange={(e) => setCapEur(e.target.value)}
            className="w-full rounded-lg border border-input bg-background py-2 pl-7 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium transition-colors hover:bg-foreground/90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            "Saved"
          ) : (
            "Save"
          )}
        </button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        This caps <em>overage</em> charges only. Your base subscription
        (&euro;{plan.priceEurMonth}/mo) is not affected.
      </p>
    </div>
  );
}
