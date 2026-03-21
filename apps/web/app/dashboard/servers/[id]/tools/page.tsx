"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Wrench } from "lucide-react";
import { cn, Button, Badge, EmptyState, Skeleton } from "@apifold/ui";
import { useTools, useUpdateTool } from "@/lib/hooks";

export default function ToolsPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = use(params);
  const { data: tools, isLoading } = useTools(id);
  const updateTool = useUpdateTool();

  const handleToggle = (toolId: string, currentActive: boolean) => {
    updateTool.mutate({
      serverId: id,
      toolId,
      input: { isActive: !currentActive },
    });
  };

  const activeCount = tools?.filter((t) => t.isActive).length ?? 0;
  const totalCount = tools?.length ?? 0;

  return (
    <div className="space-y-8 animate-in">
      {/* Back link */}
      <Link
        href={`/dashboard/servers/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Server
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-heading tracking-tight">
              Tools
            </h1>
            {!isLoading && totalCount > 0 && (
              <Badge variant="secondary" className="tabular-nums">
                {activeCount}/{totalCount} active
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground max-w-prose leading-normal">
            Manage the tools exposed by this server.
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid-auto-fill gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-card shadow-sm p-5">
              {/* Header: status dot + title + badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-2 w-2 shrink-0 rounded-full" />
                    <Skeleton className="h-4 w-36 rounded" />
                  </div>
                  <Skeleton className="mt-3 h-3 w-full rounded" />
                </div>
                <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
              </div>
              {/* Footer: params text + button */}
              <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-4">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : !tools || tools.length === 0 ? (
        <div className="rounded-xl bg-card shadow-sm p-12">
          <EmptyState
            icon={Wrench}
            title="No tools found"
            description="This server doesn't have any tools yet. Import a spec to generate tools."
          />
        </div>
      ) : (
        <div className="grid-auto-fill gap-4">
          {tools.map((tool, index) => (
            <div
              key={tool.id}
              className={cn(
                "rounded-xl bg-card shadow-sm p-5",
                "transition-shadow duration-200",
                "hover:shadow-md",
                "animate-stagger-in",
              )}
              style={{ "--i": index } as React.CSSProperties}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        tool.isActive
                          ? "bg-emerald-500"
                          : "bg-muted-foreground/40",
                      )}
                    />
                    <h3 className="truncate font-mono text-sm font-semibold">
                      {tool.name}
                    </h3>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground leading-normal">
                    {tool.description ?? "No description"}
                  </p>
                </div>
                <Badge
                  variant={tool.isActive ? "success" : "secondary"}
                  className="shrink-0"
                >
                  {tool.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-4">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {Object.keys(
                    (tool.inputSchema as Record<string, unknown>)?.properties ??
                      {},
                  ).length}{" "}
                  params
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => handleToggle(tool.id, tool.isActive)}
                  disabled={updateTool.isPending}
                >
                  {tool.isActive ? "Disable Tool" : "Enable Tool"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
