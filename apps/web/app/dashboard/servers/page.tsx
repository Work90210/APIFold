"use client";

import React from "react";
import Link from "next/link";
import {
  Server,
  ArrowRight,
  Radio,
  Shield,
  ShieldOff,
  Gauge,
} from "lucide-react";
import { EmptyState, Button } from "@apifold/ui";
import type { McpServer } from "@apifold/types";
import { useServers, useRuntimeHealth } from "@/lib/hooks";
import { cn } from "@apifold/ui";
import { ServerCardSkeleton } from "@/components/servers/server-card-skeleton";

function ServerCard({
  server,
  index,
}: {
  readonly server: McpServer;
  readonly index: number;
}) {
  return (
    <Link href={`/dashboard/servers/${server.id}`} className="group block">
      <div
        className={cn(
          "rounded-xl bg-card shadow-sm p-5",
          "transition-shadow duration-200",
          "hover:shadow-md",
          "animate-stagger-in",
        )}
        style={{ "--i": index } as React.CSSProperties}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Server className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-semibold font-heading text-base leading-tight">
                {server.name}
              </h3>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground truncate max-w-[200px]">
                {server.slug}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                server.isActive
                  ? "bg-emerald-500"
                  : "bg-muted-foreground/40",
              )}
            />
            <span
              className={cn(
                "text-xs font-medium",
                server.isActive ? "text-emerald-600" : "text-muted-foreground",
              )}
            >
              {server.isActive ? "Live" : "Offline"}
            </span>
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-5 flex items-center gap-4 border-t border-border/40 pt-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Radio className="h-3.5 w-3.5" />
            <span className="font-medium">{server.transport.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {server.authMode === "none" ? (
              <ShieldOff className="h-3.5 w-3.5" />
            ) : (
              <Shield className="h-3.5 w-3.5" />
            )}
            <span className="font-medium">
              {server.authMode === "none"
                ? "No auth"
                : server.authMode === "api_key"
                  ? "API Key"
                  : "Bearer"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" />
            <span className="font-medium tabular-nums">
              {server.rateLimitPerMinute}/min
            </span>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground/40 transition-all duration-200 group-hover:text-foreground group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

export default function ServersPage() {
  const { data: servers, status, fetchStatus } = useServers();
  const { isOnline, isLoading: isHealthLoading } = useRuntimeHealth();

  const showSkeleton = status === "pending" && fetchStatus === "fetching";

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-fluid-3xl font-bold font-heading tracking-tight">
          Servers
        </h1>
        <p className="mt-1 text-muted-foreground max-w-prose leading-normal">
          Manage your deployed MCP servers.
        </p>
        {!isHealthLoading && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
            />
            {isOnline ? "MCP Runtime Online" : "MCP Runtime Offline"}
          </div>
        )}
      </div>

      {showSkeleton ? (
        <div className="grid-auto-fill gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <ServerCardSkeleton key={i} />
          ))}
        </div>
      ) : servers && servers.length > 0 ? (
        <div className="grid-auto-fill gap-5">
          {servers.map((server, index) => (
            <ServerCard key={server.id} server={server} index={index} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Server}
          title="No servers deployed yet"
          description="Import an API spec first, then deploy an MCP server from it."
          action={
            <Button asChild variant="outline" className="rounded-lg">
              <Link href="/dashboard/specs/new">Import a Spec</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
