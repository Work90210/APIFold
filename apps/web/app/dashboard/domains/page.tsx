"use client";

import Link from "next/link";
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Server,
} from "lucide-react";
import { Badge, Skeleton, EmptyState } from "@apifold/ui";
import { useServers } from "@/lib/hooks";
import type { McpServer } from "@apifold/types";

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "apifold.dev";

export default function DomainsOverviewPage() {
  const { data: servers, isLoading } = useServers();

  const withDomains = servers?.filter((s) => s.customDomain) ?? [];
  const withoutDomains = servers?.filter((s) => !s.customDomain) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[200px]" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Domains</h1>

      <div className="mt-8 space-y-6">
        {/* Servers with domains */}
        {withDomains.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Configured ({withDomains.length})
            </h2>
            <div className="space-y-2">
              {withDomains.map((server) => (
                <DomainRow key={server.id} server={server} />
              ))}
            </div>
          </div>
        )}

        {/* Servers without domains */}
        {withoutDomains.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              No domain ({withoutDomains.length})
            </h2>
            <div className="space-y-2">
              {withoutDomains.map((server) => (
                <Link
                  key={server.id}
                  href={`/dashboard/servers/${server.id}/domain`}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-4 py-3 transition-colors hover:border-border"
                >
                  <div className="flex items-center gap-3">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">{server.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground font-mono">
                        {PLATFORM_DOMAIN}/mcp/{server.endpointId}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    Add domain <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!servers?.length && (
          <EmptyState
            icon={Globe}
            title="No servers yet"
            description="Create an MCP server first, then add a custom domain."
          />
        )}
      </div>
    </div>
  );
}

function DomainRow({ server }: { readonly server: McpServer }) {
  const isVerified = !!server.domainVerifiedAt;

  return (
    <Link
      href={`/dashboard/servers/${server.id}/domain`}
      className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-4 py-3 transition-colors hover:border-border"
    >
      <div className="flex items-center gap-3">
        {isVerified ? (
          <CheckCircle2 className="h-4 w-4 text-status-success shrink-0" />
        ) : (
          <AlertCircle className="h-4 w-4 text-status-warning shrink-0" />
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-medium">{server.customDomain}</span>
            <Badge variant={isVerified ? "default" : "outline"} className="text-xs">
              {isVerified ? "Verified" : "Pending"}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">{server.name}</span>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
