"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ChevronRight, GitBranch, Plus, Server } from "lucide-react";

import {
  Button,
  Skeleton,
  EmptyState,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  StatusDot,
} from "@apifold/ui";
import { useSpec, useServers, useSpecVersions } from "@/lib/hooks";
import { SpecHeader } from "@/components/specs/spec-header";
import { DiffBadge } from "@/components/specs/diff-badge";
import { VersionDiff } from "@/components/specs/version-diff";
import { cn } from "@apifold/ui";
import type { SpecDiff } from "@/lib/diff/spec-diff";
import type { SpecVersion } from "@apifold/types";

export default function SpecDetailPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = use(params);
  const { data: spec, isLoading: specLoading } = useSpec(id);
  const { data: servers, isLoading: serversLoading } = useServers(id);
  const { data: versions, isLoading: versionsLoading } = useSpecVersions(id);

  if (specLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!spec) return null;

  return (
    <div className="space-y-6">
      <SpecHeader spec={spec} />

      <div className="border-t border-border/40" />

      <div>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            Servers
          </h2>
          <Button
            size="sm"
            asChild
            className="rounded-lg"
          >
            <Link href={`/dashboard/specs/${id}/servers/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Create Server
            </Link>
          </Button>
        </div>

        {serversLoading ? (
          <div className="grid-auto-fill gap-5">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        ) : servers && servers.length > 0 ? (
          <div className="grid-auto-fill gap-5">
            {servers.map((server, index) => (
              <Link
                key={server.id}
                href={`/dashboard/servers/${server.id}`}
              >
                <Card
                  className="group rounded-lg border border-border transition-colors duration-150 hover:border-foreground/20"
                >
                  <CardHeader className="flex flex-row items-center gap-3">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold tracking-tight truncate">
                        {server.name}
                      </CardTitle>
                    </div>
                    <Badge
                      variant={server.isActive ? "success" : "secondary"}
                      className="shrink-0"
                    >
                      {server.isActive && (
                        <StatusDot variant="online" className="mr-1.5" />
                      )}
                      {server.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p className="font-mono text-xs">{server.slug}</p>
                      <p className="mt-1">Auth: {server.authMode}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border p-8">
            <EmptyState
              icon={Server}
              title="No servers yet"
              description="Create a server from this spec to expose it as MCP tools."
              action={
                <Button
                  size="sm"
                  asChild
                  className="rounded-lg"
                >
                  <Link href={`/dashboard/specs/${id}/servers/new`}>
                    Create Server
                  </Link>
                </Button>
              }
            />
          </div>
        )}
      </div>

      <div className="border-t border-border/40" />

      <div>
        <div className="mb-5 flex items-center gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Versions</h2>
          {!versionsLoading && versions && versions.length > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {versions.length}
            </Badge>
          )}
        </div>

        {versionsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg border border-border px-4 py-3">
                <Skeleton className="h-4 w-12 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="ml-auto h-3 w-16 rounded" />
              </div>
            ))}
          </div>
        ) : versions && versions.length > 0 ? (
          <div className="rounded-lg border border-border">
            <div className="flex items-center gap-4 border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span className="w-3" aria-hidden="true" />
              <span className="w-12">Version</span>
              <span className="w-28">Label</span>
              <span className="w-16 text-right">Tools</span>
              <span className="flex-1">Changes</span>
              <span className="w-24 text-right">Date</span>
              <span className="w-20" />
            </div>
            {versions.map((version, i) => (
              <VersionRow
                key={version.id}
                version={version}
                isLast={i === versions.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border p-8">
            <EmptyState
              icon={GitBranch}
              title="No versions yet"
              description="Versions are created when the spec is imported or updated."
            />
          </div>
        )}
      </div>
    </div>
  );
}

function VersionRow({
  version,
  isLast,
}: {
  readonly version: SpecVersion;
  readonly isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const diff = version.diffSummary as SpecDiff | null;
  const date = new Date(version.createdAt);

  return (
    <div className={cn(!isLast && "border-b border-border/50")}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-4 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-muted/30"
      >
        <ChevronRight
          className={cn(
            "h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-150",
            expanded && "rotate-90",
          )}
        />
        <span className="w-12 font-mono text-sm tabular-nums">
          v{version.versionNumber}
        </span>
        <span className="w-28 truncate text-sm text-muted-foreground">
          {version.versionLabel ?? "—"}
        </span>
        <span className="w-16 text-right text-xs text-muted-foreground tabular-nums">
          {version.toolCount}
        </span>
        <span className="flex-1">
          {diff ? (
            <DiffBadge diff={diff} />
          ) : (
            <span className="text-xs text-muted-foreground">Initial</span>
          )}
        </span>
        <span className="w-24 text-right text-xs text-muted-foreground">
          {date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <span className="w-20" />
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-1">
          {diff ? (
            <VersionDiff diff={diff} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Initial version &mdash; no previous version to compare against.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
