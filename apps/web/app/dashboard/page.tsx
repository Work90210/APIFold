"use client";

import Link from "next/link";
import { Plus, FileJson, Server, ChevronRight } from "lucide-react";
import { Button, EmptyState, StatusDot, Skeleton } from "@apifold/ui";
import { cn } from "@apifold/ui";
import type { McpServer } from "@apifold/types";
import { useSpecs, useServers, useRuntimeHealth } from "@/lib/hooks";
import { StatsRow } from "@/components/dashboard/stats-row";
import { UsageWarning } from "@/components/dashboard/usage-warning";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ServerRow({ server }: { readonly server: McpServer }) {
  return (
    <Link
      href={`/dashboard/servers/${server.id}`}
      className="group flex items-center gap-3 py-2 pl-8 transition-colors duration-150 hover:bg-muted/30 -mx-3 px-3"
    >
      <Server className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
      <span className="text-sm text-muted-foreground">{server.name}</span>
      <span className="font-mono text-xs text-muted-foreground/60">{server.slug}</span>
      <div className="flex-1" />
      <span className="text-xs text-muted-foreground hidden sm:block">{server.transport.toUpperCase()}</span>
      <div className="flex items-center gap-1.5">
        <StatusDot variant={server.isActive ? "online" : "offline"} />
        <span className={cn("text-xs", server.isActive ? "text-status-success" : "text-muted-foreground")}>
          {server.isActive ? "Live" : "Offline"}
        </span>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-foreground transition-colors duration-150" />
    </Link>
  );
}

export default function DashboardPage() {
  const { data: specs, status: specsStatus, fetchStatus: specsFetchStatus } = useSpecs();
  const { data: servers, status: serversStatus, fetchStatus: serversFetchStatus } = useServers();
  const { isOnline, isLoading: isHealthLoading } = useRuntimeHealth();

  const specsLoading = specsStatus === "pending" && specsFetchStatus === "fetching";
  const serversLoading = serversStatus === "pending" && serversFetchStatus === "fetching";

  const serversBySpec = (servers ?? []).reduce<Record<string, McpServer[]>>((acc, server) => {
    const specId = server.specId;
    return { ...acc, [specId]: [...(acc[specId] ?? []), server] };
  }, {});

  return (
    <div className="space-y-6">
      <UsageWarning />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
          {!isHealthLoading && (
            <div className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1">
              <StatusDot variant={isOnline ? "online" : "offline"} />
              <span className="text-xs text-muted-foreground">
                {isOnline ? "Runtime online" : "Runtime offline"}
              </span>
            </div>
          )}
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/specs/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Import Spec
          </Link>
        </Button>
      </div>

      <StatsRow />

      <div>
        {specsLoading || serversLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-border py-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-48" />
                <div className="flex-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : specs && specs.length > 0 ? (
          <div>
            {specs.map((spec) => {
              const specServers = serversBySpec[spec.id] ?? [];
              return (
                <div key={spec.id}>
                  <Link
                    href={`/dashboard/specs/${spec.id}`}
                    className="group flex items-center gap-4 border-b border-border py-3 transition-colors duration-150 hover:bg-muted/30 -mx-3 px-3"
                  >
                    <FileJson className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{spec.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono tabular-nums">v{spec.version}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{spec.toolCount} tools</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {specServers.length} {specServers.length === 1 ? "server" : "servers"}
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:block">{timeAgo(spec.createdAt)}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-colors duration-150 group-hover:text-foreground" />
                  </Link>
                  {specServers.map((server) => (
                    <ServerRow key={server.id} server={server} />
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={FileJson}
            title="No specs yet"
            description="Import an OpenAPI spec to generate MCP tools from your API."
            action={
              <Button asChild size="sm">
                <Link href="/dashboard/specs/new">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Import Spec
                </Link>
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
