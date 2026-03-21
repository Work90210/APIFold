import { Suspense } from "react";
import { SettingsHeader } from "./_components/settings-header";
import { AccountSection } from "./_components/account-section";
import { PlanBanner } from "./_components/plan-banner";
import { UsageDashboard } from "./_components/usage-dashboard";
import { PlanComparison } from "./_components/plan-comparison";
import { BillingSection } from "./_components/billing-section";
import { BudgetLimit } from "./_components/budget-limit";
import { DangerZone } from "./_components/danger-zone";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      <Suspense>
        <SettingsHeader />
      </Suspense>

      <div className="border-t border-border/40" />

      {/* Account + Current Plan — 2 columns */}
      <div className="grid gap-6 md:grid-cols-2">
        <div
          className="animate-stagger-in"
          style={{ "--i": 0 } as React.CSSProperties}
        >
          <AccountSection />
        </div>
        <div
          className="animate-stagger-in"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          <PlanBanner />
        </div>
      </div>

      {/* Usage Dashboard — full width */}
      <div
        className="animate-stagger-in"
        style={{ "--i": 2 } as React.CSSProperties}
      >
        <UsageDashboard />
      </div>

      {/* Plan Comparison — full width */}
      <div
        className="animate-stagger-in"
        style={{ "--i": 3 } as React.CSSProperties}
      >
        <PlanComparison />
      </div>

      {/* Budget Limit — full width (paid plans only) */}
      <div
        className="animate-stagger-in"
        style={{ "--i": 4 } as React.CSSProperties}
      >
        <BudgetLimit />
      </div>

      {/* Billing Management — full width */}
      <div
        className="animate-stagger-in"
        style={{ "--i": 5 } as React.CSSProperties}
      >
        <BillingSection />
      </div>

      {/* Danger Zone — full width */}
      <div
        className="animate-stagger-in"
        style={{ "--i": 6 } as React.CSSProperties}
      >
        <DangerZone />
      </div>
    </div>
  );
}
