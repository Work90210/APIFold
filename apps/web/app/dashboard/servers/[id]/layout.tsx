"use client";

import type { ReactNode } from "react";
import { use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Server,
  Wrench,
  Terminal,
  ScrollText,
  Key,
  Shield,
  Globe,
  Download,
  BarChart3,
  Settings,
  ChevronLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn, StatusDot } from "@apifold/ui";
import { useServer } from "@/lib/hooks";

interface SidebarItem {
  readonly title: string;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly exact?: boolean;
}

function buildItems(serverId: string): readonly SidebarItem[] {
  const base = `/dashboard/servers/${serverId}`;
  return [
    { title: "Overview", href: base, icon: Server, exact: true },
    { title: "Tools", href: `${base}/tools`, icon: Wrench },
    { title: "Console", href: `${base}/console`, icon: Terminal },
    { title: "Logs", href: `${base}/logs`, icon: ScrollText },
    { title: "Analytics", href: `${base}/analytics`, icon: BarChart3 },
    { title: "Credentials", href: `${base}/credentials`, icon: Key },
    { title: "Profiles", href: `${base}/profiles`, icon: Shield },
    { title: "Domain", href: `${base}/domain`, icon: Globe },
    { title: "Export", href: `${base}/export`, icon: Download },
    { title: "Settings", href: `${base}/settings`, icon: Settings },
  ];
}

export default function ServerDetailLayout({
  children,
  params,
}: {
  readonly children: ReactNode;
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const { data: server } = useServer(id);
  const items = buildItems(id);

  return (
    <div className="flex flex-col -mx-6 -mt-8 md:flex-row md:gap-0">
      {/* Mobile: horizontal scrollable nav */}
      <nav
        className="flex overflow-x-auto border-b border-border scrollbar-thin md:hidden"
        aria-label="Server navigation"
      >
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-1 px-4 py-3 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </Link>
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 px-3 py-3 text-xs whitespace-nowrap transition-colors duration-150",
                isActive
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              {item.title}
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-[2px] bg-foreground" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Desktop: vertical sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-border px-4 py-6 md:block">
        <Link
          href="/dashboard"
          className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </Link>

        {server && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold truncate">{server.name}</h2>
            <div className="mt-1 flex items-center gap-1.5">
              <StatusDot variant={server.isActive ? "online" : "offline"} />
              <span className={cn(
                "text-xs",
                server.isActive ? "text-status-success" : "text-muted-foreground",
              )}>
                {server.isActive ? "Live" : "Offline"}
              </span>
            </div>
          </div>
        )}

        <nav className="flex flex-col gap-0.5">
          {items.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150",
                  isActive
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 px-4 py-6 md:px-8">
        {children}
      </main>
    </div>
  );
}
