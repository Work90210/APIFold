"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Box,
  Server,
  FileText,
  Globe,
  BarChart3,
  ScrollText,
  Webhook,
  KeyRound,
  Users,
  DollarSign,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@apifold/ui";

interface NavItem {
  readonly label: string;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly badge?: string;
}

interface NavSection {
  readonly title: string;
  readonly items: readonly NavItem[];
}

const NAV_SECTIONS: readonly NavSection[] = [
  {
    title: "Workspace",
    items: [
      { label: "Overview", href: "/dashboard", icon: Box },
      { label: "Servers", href: "/dashboard/servers", icon: Server },
      { label: "Specs", href: "/dashboard/specs", icon: FileText },
      { label: "Marketplace", href: "/dashboard/specs/new/registry", icon: Globe },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
      { label: "Logs", href: "/dashboard/logs", icon: ScrollText },
      { label: "Webhooks", href: "/dashboard/webhooks", icon: Webhook },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Credentials", href: "/dashboard/settings", icon: KeyRound },
      { label: "Domains", href: "/dashboard/domains", icon: Globe },
      { label: "Team", href: "/dashboard/settings/members", icon: Users },
      { label: "Billing", href: "/dashboard/billing", icon: DollarSign },
    ],
  },
];

function isActive(pathname: string, href: string, allHrefs: readonly string[]): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  // Find the most specific (longest) matching href — only that one is active
  const bestMatch = allHrefs.find((h) => h !== "/dashboard" && pathname.startsWith(h));
  return bestMatch === href;
}

/** All nav hrefs sorted longest-first so deeper paths win over shallower ones. */
const ALL_HREFS = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href))
  .sort((a, b) => b.length - a.length);

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-3">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-150 hover:bg-surface-2"
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white"
            style={{
              background: "linear-gradient(135deg, var(--brand-violet), var(--brand-pink))",
            }}
          >
            A
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">Acme Inc.</p>
            <p className="truncate text-xs text-muted-foreground">Pro &middot; 8 members</p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href, ALL_HREFS);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors duration-150",
                        active
                          ? "bg-surface-2 font-medium text-foreground shadow-[inset_2px_0_0_var(--brand-violet)]"
                          : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-[var(--brand-violet)]" : "",
                        )}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="rounded-lg bg-surface-2 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">This month</span>
            <span className="font-medium text-foreground">PRO</span>
          </div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-sm font-semibold tabular-nums text-foreground">147K</span>
            <span className="text-xs text-muted-foreground">/ 500K</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full"
              style={{
                width: "29.4%",
                background: "linear-gradient(90deg, var(--brand-violet), var(--brand-cyan))",
              }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
