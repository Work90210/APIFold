"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Loader2, Info } from "lucide-react";

interface Preferences {
  weeklyUsageSummary: boolean;
  monthlyUsageSummary: boolean;
  renewalReminder: boolean;
  usageLimitWarning: boolean;
  budgetCapWarning: boolean;
  overageAlert: boolean;
}

const DEFAULT_PREFS: Preferences = {
  weeklyUsageSummary: true,
  monthlyUsageSummary: false,
  renewalReminder: true,
  usageLimitWarning: true,
  budgetCapWarning: true,
  overageAlert: true,
};

function Toggle({
  id,
  checked,
  onChange,
  disabled,
}: {
  id?: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-blue-500" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function PreferenceRow({
  label,
  description,
  checked,
  onChange,
  saving,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  saving: boolean;
}) {
  const id = `toggle-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="flex items-center justify-between py-3">
      <div className="pr-4">
        <label
          htmlFor={id}
          className="text-sm font-medium text-foreground cursor-pointer block"
        >
          {label}
        </label>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Toggle id={id} checked={checked} onChange={onChange} disabled={saving} />
    </div>
  );
}

export function NotificationSection() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/email/preferences")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load preferences");
        return res.json();
      })
      .then((data: Preferences) => {
        setPrefs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const updatePreference = useCallback(
    async (key: keyof Preferences, value: boolean) => {
      const previousValue = prefs[key];
      setPrefs((prev) => ({ ...prev, [key]: value }));
      setSavingKeys((prev) => new Set([...prev, key]));

      try {
        const res = await fetch("/api/email/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: value }),
        });
        if (!res.ok) throw new Error("Save failed");
      } catch {
        setPrefs((prev) => ({ ...prev, [key]: previousValue }));
      } finally {
        setSavingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [prefs],
  );

  if (loading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            Notifications
          </h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">
          Email Notifications
        </h2>
      </div>

      {/* Usage Alerts */}
      <div className="mb-6">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Usage Alerts
        </h3>
        <div className="divide-y divide-border/50">
          <PreferenceRow
            label="Weekly summary"
            description="Get a summary of your MCP server performance every Monday"
            checked={prefs.weeklyUsageSummary}
            onChange={(v) => updatePreference("weeklyUsageSummary", v)}
            saving={savingKeys.has("weeklyUsageSummary")}
          />
          <PreferenceRow
            label="Monthly summary"
            description="Receive a monthly usage report on the 1st of each month"
            checked={prefs.monthlyUsageSummary}
            onChange={(v) => updatePreference("monthlyUsageSummary", v)}
            saving={savingKeys.has("monthlyUsageSummary")}
          />
          <PreferenceRow
            label="Usage limit warnings"
            description="Get notified when you reach 80% and 95% of your request limit"
            checked={prefs.usageLimitWarning}
            onChange={(v) => updatePreference("usageLimitWarning", v)}
            saving={savingKeys.has("usageLimitWarning")}
          />
          <PreferenceRow
            label="Budget cap warnings"
            description="Get notified when approaching your budget cap"
            checked={prefs.budgetCapWarning}
            onChange={(v) => updatePreference("budgetCapWarning", v)}
            saving={savingKeys.has("budgetCapWarning")}
          />
          <PreferenceRow
            label="Overage alerts"
            description="Get notified about overage charges"
            checked={prefs.overageAlert}
            onChange={(v) => updatePreference("overageAlert", v)}
            saving={savingKeys.has("overageAlert")}
          />
        </div>
      </div>

      {/* Billing */}
      <div className="mb-6">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Billing
        </h3>
        <div className="divide-y divide-border/50">
          <PreferenceRow
            label="Renewal reminders"
            description="Get notified before your subscription renews"
            checked={prefs.renewalReminder}
            onChange={(v) => updatePreference("renewalReminder", v)}
            saving={savingKeys.has("renewalReminder")}
          />
        </div>
      </div>

      {/* Non-toggleable info */}
      <div className="rounded-lg bg-muted/50 p-4 flex gap-3">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">
            Always-on notifications
          </p>
          <p>
            Welcome emails, subscription confirmations, payment failure alerts,
            security notifications, and account deletion confirmations cannot be
            disabled. These are essential for your account security and billing.
          </p>
        </div>
      </div>
    </div>
  );
}
