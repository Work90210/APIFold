"use client";

import Link from "next/link";
import { Server, ChevronRight } from "lucide-react";
import { EmptyState, Button, StatusDot, Skeleton } from "@apifold/ui";
import type { McpServer } from "@apifold/types";
import { useServers, useRuntimeHealth } from "@/lib/hooks";
import { cn } from "@apifold/ui";

function formatAuth(mode: McpServer["authMode"]): string {
  if (mode === "none") return "No auth";
  if (mode === "api_key") return "API Key";
  if (mode === "bearer") return "Bearer";
  if (mode === "oauth2_authcode") return "OAuth2";
  if (mode === "oauth2_client_creds") return "OAuth2 CC";
  return mode;
}

function ServerRow({ server }: { readonly server: McpServer }) {
  return (
    <Link
      href={`/dashboard/servers/${server.id}`}
      className="group flex items-center gap-4 border-b border-border py-3 transition-colors duration-150 hover:bg-muted/30 -mx-3 px-3 last:border-0"
    >
      <Server className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{server.name}</span>
        <span className="ml-2 font-mono text-xs text-muted-foreground">{server.slug}</span>
      </div>
      <span className="text-xs text-muted-foreground font-mono hidden sm:block">
        {server.transport.toUpperCase()}
      </span>
      <span className="text-xs text-muted-foreground hidden sm:block">
        {formatAuth(server.authMode)}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums hidden md:block">
        {server.rateLimitPerMinute}/min
      </span>
      <div className="flex items-center gap-1.5">
        <StatusDot variant={server.isActive ? "online" : "offline"} />
        <span
          className={cn(
            "text-xs font-medium",
            server.isActive ? "text-status-success" : "text-muted-foreground",
          )}
        >
          {server.isActive ? "Live" : "Offline"}
        </span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-colors duration-150 group-hover:text-foreground" />
    </Link>
  );
}

function ServerRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-border py-3">
      <Skeleton className="h-4 w-4 shrink-0" />
      <Skeleton className="h-4 w-48" />
      <div className="flex-1" />
      <Skeleton className="h-3 w-10" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export default function ServersPage() {
  const { data: servers, status, fetchStatus } = useServers();
  const { isOnline, isLoading: isHealthLoading } = useRuntimeHealth();

  const showSkeleton = status === "pending" && fetchStatus === "fetching";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Servers</h1>
          {!isHealthLoading && (
            <div className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1">
              <StatusDot variant={isOnline ? "online" : "offline"} />
              <span className="text-xs text-muted-foreground">
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
          )}
        </div>
      </div>

      {showSkeleton ? (
        <div>
          {Array.from({ length: 3 }).map((_, i) => (
            <ServerRowSkeleton key={i} />
          ))}
        </div>
      ) : servers && servers.length > 0 ? (
        <div>
          {servers.map((server) => (
            <ServerRow key={server.id} server={server} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Server}
          title="No servers yet"
          description="Import an API spec first, then deploy an MCP server from it."
          action={
            <Button asChild size="sm">
              <Link href="/dashboard/specs/new">Import a Spec</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
