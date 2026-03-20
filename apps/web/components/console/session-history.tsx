"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn, Badge, CodeBlock } from "@apifold/ui";

interface HistoryEntry {
  readonly id: string;
  readonly toolName: string;
  readonly input: Record<string, unknown>;
  readonly output: unknown;
  readonly isError: boolean;
  readonly durationMs: number;
  readonly timestamp: Date;
}

interface SessionHistoryProps {
  readonly entries: readonly HistoryEntry[];
}

export function SessionHistory({ entries }: SessionHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground leading-normal">
        No calls yet in this session.
      </p>
    );
  }

  return (
    <div className="space-y-2 pt-4">
      {entries.map((entry, index) => {
        const isExpanded = expandedId === entry.id;
        return (
          <div
            key={entry.id}
            className="overflow-hidden rounded-xl border transition-all duration-300 ease-out-expo animate-stagger-in"
            style={{ "--i": index } as React.CSSProperties}
          >
            <button
              type="button"
              onClick={() =>
                setExpandedId(isExpanded ? null : entry.id)
              }
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-all duration-200 ease-out-expo hover:bg-accent"
            >
              <div
                className={cn(
                  "transition-transform duration-300 ease-out-expo",
                  isExpanded && "rotate-90",
                )}
              >
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </div>
              <span className="flex-1 truncate font-mono text-xs">
                {entry.toolName}
              </span>
              <Badge
                variant={entry.isError ? "error" : "success"}
                className="shrink-0 tabular-nums"
              >
                {entry.durationMs}ms
              </Badge>
            </button>
            <div
              className={cn(
                "grid transition-all duration-300 ease-out-expo",
                isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <div className="space-y-2 border-t p-4">
                  <CodeBlock
                    code={JSON.stringify(entry.input, null, 2)}
                    language="json"
                    title="Input"
                  />
                  <CodeBlock
                    code={JSON.stringify(entry.output, null, 2)}
                    language="json"
                    title="Output"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
