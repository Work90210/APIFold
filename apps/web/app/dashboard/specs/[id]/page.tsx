"use client";

import { use } from "react";
import Link from "next/link";
import { Plus, Server } from "lucide-react";
import { BackLink } from "@/components/shared/back-link";
import {
  Button,
  Skeleton,
  EmptyState,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@apifold/ui";
import { useSpec, useServers } from "@/lib/hooks";
import { SpecHeader } from "@/components/specs/spec-header";
import { cn } from "@apifold/ui";

export default function SpecDetailPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = use(params);
  const { data: spec, isLoading: specLoading } = useSpec(id);
  const { data: servers, isLoading: serversLoading } = useServers(id);

  if (specLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!spec) return null;

  return (
    <div className="animate-in space-y-8">
      <BackLink href="/dashboard/specs" label="Back to Specs" />

      <SpecHeader spec={spec} />

      <div className="border-t border-border/40" />

      <div>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-fluid-xl font-semibold font-heading tracking-tight">
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
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ) : servers && servers.length > 0 ? (
          <div className="grid-auto-fill gap-5">
            {servers.map((server, index) => (
              <Link
                key={server.id}
                href={`/dashboard/servers/${server.id}`}
              >
                <Card
                  className={cn(
                    "group rounded-xl transition-shadow duration-200 hover:shadow-md animate-stagger-in",
                  )}
                  style={{ "--i": index } as React.CSSProperties}
                >
                  <CardHeader className="flex flex-row items-center gap-3">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-heading tracking-tight truncate">
                        {server.name}
                      </CardTitle>
                    </div>
                    <Badge
                      variant={server.isActive ? "success" : "secondary"}
                      className="shrink-0"
                    >
                      {server.isActive && (
                        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
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
          <div className="rounded-xl bg-card shadow-sm p-12">
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
    </div>
  );
}
