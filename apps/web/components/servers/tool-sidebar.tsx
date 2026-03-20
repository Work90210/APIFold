"use client";

import type { McpTool } from "@apifold/types";
import { cn, Badge } from "@apifold/ui";
import { useUIStore } from "@/lib/stores/ui-store";

interface ToolSidebarProps {
  readonly tools: readonly McpTool[];
}

export function ToolSidebar({ tools }: ToolSidebarProps) {
  const { selectedToolId, selectTool } = useUIStore();

  return (
    <div className="w-64 shrink-0 border-r">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Tools ({tools.length})
        </h3>
      </div>
      <nav role="navigation" aria-label="Tool list" className="space-y-0.5 px-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => selectTool(tool.id)}
            role="menuitem"
            className={cn(
              "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
              selectedToolId === tool.id && "bg-accent",
            )}
          >
            <span className="truncate font-mono text-xs">{tool.name}</span>
            <Badge
              variant={tool.isActive ? "success" : "secondary"}
              className="ml-2 shrink-0"
            >
              {tool.isActive ? "On" : "Off"}
            </Badge>
          </button>
        ))}
      </nav>
    </div>
  );
}
