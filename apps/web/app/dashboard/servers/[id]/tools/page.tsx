"use client";

import { use } from "react";
import { Wrench } from "lucide-react";
import { Button, Badge, EmptyState, Skeleton, StatusDot } from "@apifold/ui";
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Tools</h1>
        {!isLoading && totalCount > 0 && (
          <Badge variant="secondary" className="tabular-nums">
            {activeCount}/{totalCount} active
          </Badge>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border border-border px-4 py-3">
              <Skeleton className="h-2 w-2 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="ml-auto h-3 w-16 rounded" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      ) : !tools || tools.length === 0 ? (
        <div className="rounded-lg border border-border p-12">
          <EmptyState
            icon={Wrench}
            title="No tools found"
            description="This server doesn't have any tools yet. Import a spec to generate tools."
          />
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          {/* Table header */}
          <div className="flex items-center gap-4 border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span className="w-5" />
            <span className="flex-1">Name</span>
            <span className="hidden w-64 sm:block">Description</span>
            <span className="w-16 text-right">Params</span>
            <span className="w-20" />
          </div>
          {/* Table rows */}
          {tools.map((tool, i) => (
            <div
              key={tool.id}
              className={`flex items-center gap-4 px-4 py-2.5 transition-colors duration-150 hover:bg-muted/30 ${i < tools.length - 1 ? "border-b border-border/50" : ""}`}
            >
              <StatusDot variant={tool.isActive ? "online" : "offline"} />
              <span className="flex-1 truncate font-mono text-sm">
                {tool.name}
              </span>
              <span className="hidden w-64 truncate text-xs text-muted-foreground sm:block">
                {tool.description ?? "—"}
              </span>
              <span className="w-16 text-right text-xs text-muted-foreground tabular-nums">
                {Object.keys(
                  (tool.inputSchema as Record<string, unknown>)?.properties ??
                    {},
                ).length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="w-20 shrink-0 text-xs"
                onClick={() => handleToggle(tool.id, tool.isActive)}
                disabled={updateTool.isPending}
              >
                {tool.isActive ? "Disable" : "Enable"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
