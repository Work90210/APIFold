"use client";

import { use } from "react";
import Link from "next/link";
import {
  Wrench,
  Terminal,
  ScrollText,
  Download,
  Radio,
  Shield,
  ShieldOff,
  Gauge,
  Server,
} from "lucide-react";
import { Skeleton } from "@apifold/ui";
import { cn } from "@apifold/ui";
import { useServer } from "@/lib/hooks";
import { BackLink } from "@/components/shared/back-link";
import { ConfigForm } from "@/components/servers/config-form";
import { SnippetCopier } from "@/components/servers/snippet-copier";

export default function ServerDetailPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = use(params);
  const { data: server, isLoading } = useServer(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="col-span-2 h-96 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!server) return null;

  const navItems = [
    { label: "Tools", href: `/dashboard/servers/${id}/tools`, icon: Wrench },
    { label: "Console", href: `/dashboard/servers/${id}/console`, icon: Terminal },
    { label: "Logs", href: `/dashboard/servers/${id}/logs`, icon: ScrollText },
    { label: "Export", href: `/dashboard/servers/${id}/export`, icon: Download },
  ];

  return (
    <div className="space-y-8 animate-in">
      <BackLink href="/dashboard/servers" label="Back to Servers" />

      {/* Header */}
      <div className="rounded-xl bg-card shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Server className="h-6 w-6 text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-bold font-heading tracking-tight">
                {server.name}
              </h1>
              <p className="mt-0.5 font-mono text-sm text-muted-foreground">
                {server.slug}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                server.isActive
                  ? "bg-emerald-500"
                  : "bg-muted-foreground/40",
              )}
            />
            <span
              className={cn(
                "text-sm font-semibold",
                server.isActive ? "text-emerald-600" : "text-muted-foreground",
              )}
            >
              {server.isActive ? "Live" : "Offline"}
            </span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-border/40 pt-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Radio className="h-4 w-4" />
            <span className="font-medium">{server.transport.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {server.authMode === "none" ? (
              <ShieldOff className="h-4 w-4" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            <span className="font-medium">
              {server.authMode === "none"
                ? "No auth"
                : server.authMode === "api_key"
                  ? "API Key"
                  : "Bearer"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Gauge className="h-4 w-4" />
            <span className="font-medium tabular-nums">
              {server.rateLimitPerMinute} req/min
            </span>
          </div>
        </div>
      </div>

      {/* Navigation tabs — text links with underline active state */}
      <div role="tablist" className="flex flex-wrap gap-6 border-b border-border/40 pb-px">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            role="tab"
            className="flex items-center gap-2 pb-2.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground border-b-2 border-transparent hover:border-foreground/20"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <ConfigForm server={server} />
        </div>
        <div className="space-y-6">
          <SnippetCopier server={server} />
        </div>
      </div>
    </div>
  );
}
