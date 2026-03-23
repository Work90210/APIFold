"use client";

import { use } from "react";
import Link from "next/link";
import { Radio, Shield, ShieldOff, Gauge, Globe, Wrench, Terminal, BarChart3, ChevronRight, ExternalLink, GitBranch, Rocket } from "lucide-react";
import { Skeleton, StatusDot, Button, CopyButton, Badge } from "@apifold/ui";
import { cn } from "@apifold/ui";
import { useServer, useTools, useSpecVersions, usePromoteVersion } from "@/lib/hooks";
import { SnippetCopier } from "@/components/servers/snippet-copier";

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "apifold.dev";

function formatAuth(mode: string): string {
  if (mode === "none") return "No auth";
  if (mode === "api_key") return "API Key";
  if (mode === "bearer") return "Bearer";
  if (mode === "oauth2_authcode") return "OAuth2";
  if (mode === "oauth2_client_creds") return "OAuth2 CC";
  return mode;
}

export default function ServerDetailPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = use(params);
  const { data: server, isLoading } = useServer(id);
  const { data: tools } = useTools(id);
  const specId = server?.specId;
  const { data: versions } = useSpecVersions(specId ?? "");
  const promoteVersion = usePromoteVersion();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!server) return null;

  const endpointUrl = `https://${PLATFORM_DOMAIN}/${server.slug}/sse`;
  const activeTools = tools?.filter((t) => t.isActive).length ?? 0;
  const totalTools = tools?.length ?? 0;

  // TODO: versions[0] is the newest version, not necessarily the one deployed
  // to production. Once spec_releases query is wired, replace this with the
  // actual promoted production release to avoid showing a preview version here.
  const latestVersion = versions?.[0];
  const productionUrl = `https://${server.slug}.${PLATFORM_DOMAIN}`;

  return (
    <div className="space-y-6">
      {/* Production Deployment — Vercel-style prominent card */}
      <div className="rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-medium">Production Deployment</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/specs/${server.specId}`}>
                <ExternalLink className="mr-1.5 h-3 w-3" />
                Spec
              </Link>
            </Button>
            {latestVersion && versions && versions.length > 1 && specId && (
              <Button
                variant="outline"
                size="sm"
                disabled={promoteVersion.isPending}
                onClick={() => {
                  const previousVersion = versions?.[1];
                  if (!previousVersion) return;
                  const confirmed = window.confirm(
                    "Are you sure you want to rollback production to the previous version?"
                  );
                  if (!confirmed) return;
                  promoteVersion.mutate({
                    specId,
                    versionId: previousVersion.id,
                    serverId: id,
                    environment: "production",
                  });
                }}
              >
                {promoteVersion.isPending ? "Rolling back..." : "Rollback"}
              </Button>
            )}
            <Button size="sm" asChild>
              <a href={productionUrl} target="_blank" rel="noopener noreferrer">
                Visit
              </a>
            </Button>
          </div>
        </div>
        <div className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
            {/* Left: preview / branding area */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted/40">
                <Globe className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{server.name}</p>
                <p className="text-xs text-muted-foreground">{server.slug}.{PLATFORM_DOMAIN}</p>
              </div>
            </div>

            {/* Right: stacked key-value pairs */}
            <dl className="flex flex-col gap-2 text-sm sm:items-end">
              <div className="flex items-center gap-2">
                <dt className="text-xs text-muted-foreground">Endpoint</dt>
                <dd className="flex items-center gap-1.5">
                  <code className="rounded-md bg-muted/50 px-2 py-0.5 font-mono text-xs">{endpointUrl}</code>
                  <CopyButton value={endpointUrl} className="h-6 w-6 shrink-0" />
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-xs text-muted-foreground">Domain</dt>
                <dd className="flex items-center gap-1.5 font-mono text-xs">
                  <span>{server.slug}.{PLATFORM_DOMAIN}</span>
                  {server.customDomain && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span>{server.customDomain}</span>
                    </>
                  )}
                </dd>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <dt className="text-xs text-muted-foreground">Status</dt>
                  <dd className="flex items-center gap-1.5">
                    <StatusDot variant={server.isActive ? "online" : "offline"} />
                    <span className={cn("text-xs font-medium", server.isActive ? "text-status-success" : "text-muted-foreground")}>
                      {server.isActive ? "Ready" : "Offline"}
                    </span>
                  </dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="text-xs text-muted-foreground">Created</dt>
                  <dd className="text-xs tabular-nums">
                    {new Date(server.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          {/* Transport / auth info */}
          <div className="mt-3 flex items-center gap-4 border-t border-border/50 pt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5" />
              {server.transport.toUpperCase()}
            </div>
            <div className="flex items-center gap-1.5">
              {server.authMode === "none" ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
              {formatAuth(server.authMode)}
            </div>
            <div className="flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5" />
              <span className="tabular-nums">{server.rateLimitPerMinute}/min</span>
            </div>
            {latestVersion && (
              <div className="flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5" />
                <span className="font-mono tabular-nums">v{latestVersion.versionNumber}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Three-column quick access */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Link href={`/dashboard/servers/${id}/tools`} className="group flex items-center justify-between rounded-lg border border-border p-4 transition-colors duration-150 hover:bg-muted/30">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium"><Wrench className="h-4 w-4 text-muted-foreground" />Tools</div>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">{activeTools}/{totalTools} active</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
        </Link>
        <Link href={`/dashboard/servers/${id}/console`} className="group flex items-center justify-between rounded-lg border border-border p-4 transition-colors duration-150 hover:bg-muted/30">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium"><Terminal className="h-4 w-4 text-muted-foreground" />Console</div>
            <p className="mt-1 text-xs text-muted-foreground">Test tools with live requests</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
        </Link>
        <Link href={`/dashboard/servers/${id}/analytics`} className="group flex items-center justify-between rounded-lg border border-border p-4 transition-colors duration-150 hover:bg-muted/30">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium"><BarChart3 className="h-4 w-4 text-muted-foreground" />Analytics</div>
            <p className="mt-1 text-xs text-muted-foreground">Traffic, latency, errors</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
        </Link>
      </div>

      {/* Deployments — Vercel-style list */}
      {versions && versions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">Deployments</h2>
          </div>
          <div className="rounded-lg border border-border">
            {/* TODO: isProduction should be determined from spec_releases table, not index */}
            {versions.map((v, i) => {
              const isProduction = i === 0;
              const url = isProduction
                ? `${server.slug}.${PLATFORM_DOMAIN}`
                : `v${v.versionNumber}.${server.slug}.${PLATFORM_DOMAIN}`;
              return (
                <div key={v.id} className={cn("flex items-center gap-4 px-4 py-3 transition-colors duration-150 hover:bg-muted/30", i < versions.length - 1 && "border-b border-border/50")}>
                  <StatusDot variant={isProduction && server.isActive ? "online" : "offline"} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm">{url}</code>
                      <CopyButton value={`https://${url}`} className="h-5 w-5" />
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono tabular-nums">v{v.versionNumber}</span>
                      {v.versionLabel && <span>({v.versionLabel})</span>}
                      <span>·</span>
                      <span className="tabular-nums">{v.toolCount} tools</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isProduction ? (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">Production</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Preview</Badge>
                    )}
                    {v.isBreaking && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Breaking</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {new Date(v.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  {!isProduction && specId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 text-xs"
                      disabled={promoteVersion.isPending}
                      onClick={() => {
                        promoteVersion.mutate({
                          specId,
                          versionId: v.id,
                          serverId: id,
                          environment: "production",
                        });
                      }}
                    >
                      {promoteVersion.isPending ? "Promoting..." : "Promote"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick connect */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Quick connect</h2>
        <SnippetCopier server={server} />
      </div>
    </div>
  );
}
