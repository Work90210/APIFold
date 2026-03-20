"use client";

import { AccountInfo } from "@/components/settings/account-info";
import { PlanCard } from "@/components/settings/plan-card";

export default function SettingsPage() {
  return (
    <div className="animate-in space-y-8">
      <div>
        <h1 className="text-fluid-3xl font-bold font-heading tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-prose leading-normal">
          Manage your account and subscription.
        </p>
      </div>

      <div className="border-t border-border/40" />

      <div className="grid gap-6 md:grid-cols-2">
        <div
          className="animate-stagger-in"
          style={{ "--i": 0 } as React.CSSProperties}
        >
          <AccountInfo />
        </div>
        <div
          className="animate-stagger-in"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          <PlanCard />
        </div>
      </div>
    </div>
  );
}
