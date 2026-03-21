"use client";

import { useState, useCallback, use } from "react";
import Link from "next/link";
import { ArrowLeft, Terminal, ChevronDown } from "lucide-react";
import { cn, Skeleton, EmptyState } from "@apifold/ui";
import { useTools, useTestTool } from "@/lib/hooks";
import { SchemaForm } from "@/components/console/schema-form";
import { ResponseViewer } from "@/components/console/response-viewer";
import { SessionHistory } from "@/components/console/session-history";

interface HistoryEntry {
  readonly id: string;
  readonly toolName: string;
  readonly input: Record<string, unknown>;
  readonly output: unknown;
  readonly isError: boolean;
  readonly durationMs: number;
  readonly timestamp: Date;
}

export default function ConsolePage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = use(params);
  const { data: tools, isLoading: toolsLoading } = useTools(id);
  const testTool = useTestTool();
  const [selectedToolName, setSelectedToolName] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lastResponse, setLastResponse] = useState<{
    readonly content: unknown;
    readonly isError: boolean;
    readonly durationMs: number;
  } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const activeTools = tools?.filter((t) => t.isActive) ?? [];
  const selectedTool = tools?.find((t) => t.name === selectedToolName);

  const handleExecute = useCallback(
    (input: Record<string, unknown>) => {
      if (!selectedToolName) return;
      testTool.mutate(
        { serverId: id, toolName: selectedToolName, input },
        {
          onSuccess: (result) => {
            setLastResponse(result);
            setHistory((prev) => [
              {
                id: crypto.randomUUID(),
                toolName: selectedToolName,
                input,
                output: result.content,
                isError: result.isError,
                durationMs: result.durationMs,
                timestamp: new Date(),
              },
              ...prev.slice(0, 9),
            ]);
          },
        },
      );
    },
    [id, selectedToolName, testTool],
  );

  return (
    <div className="animate-in space-y-8">
      {/* Back link */}
      <Link
        href={`/dashboard/servers/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Server
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-fluid-3xl font-bold font-heading tracking-tight">
          Console
        </h1>
        <p className="mt-1 text-sm text-muted-foreground leading-normal max-w-prose">
          Test your tools with live requests.
        </p>
      </div>

      <div className="border-t border-border/40" />

      {/* Content */}
      {toolsLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : activeTools.length === 0 ? (
        <div className="rounded-xl bg-card shadow-sm p-12">
          <EmptyState
            icon={Terminal}
            title="No tools to test"
            description="This server doesn't have any active tools."
          />
        </div>
      ) : (
        <>
          {/* Two-column layout */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Tool picker + Input form */}
            <div className="space-y-6">
              {/* Tool picker dropdown */}
              <div className="rounded-xl bg-card shadow-sm p-6">
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                  Select Tool
                </h3>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPickerOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-lg border border-border/40 bg-background px-4 py-2.5 text-sm transition-colors hover:bg-accent"
                  >
                    <span
                      className={cn(
                        "font-mono text-xs",
                        !selectedToolName && "text-muted-foreground",
                      )}
                    >
                      {selectedToolName ?? "Choose a tool..."}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-200",
                        pickerOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {pickerOpen && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-auto rounded-xl bg-card shadow-lg border border-border/40">
                      {activeTools.map((tool) => (
                        <button
                          key={tool.name}
                          type="button"
                          onClick={() => {
                            setSelectedToolName(tool.name);
                            setPickerOpen(false);
                            setLastResponse(null);
                          }}
                          className={cn(
                            "flex w-full flex-col px-4 py-2.5 text-left transition-colors hover:bg-accent",
                            selectedToolName === tool.name && "bg-accent",
                          )}
                        >
                          <span className="font-mono text-xs font-medium">
                            {tool.name}
                          </span>
                          {tool.description && (
                            <span className="mt-0.5 truncate text-xs text-muted-foreground">
                              {tool.description}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Schema form */}
              <div className="rounded-xl bg-card shadow-sm p-6">
                <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
                  Input
                </h3>
                {selectedTool ? (
                  <SchemaForm
                    schema={
                      selectedTool.inputSchema as Record<string, unknown>
                    }
                    onSubmit={handleExecute}
                    isLoading={testTool.isPending}
                  />
                ) : (
                  <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                    Select a tool to begin
                  </div>
                )}
              </div>
            </div>

            {/* Right: Response viewer */}
            <div className="rounded-xl bg-card shadow-sm p-6">
              <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
                Response
              </h3>
              <ResponseViewer
                response={lastResponse}
                isLoading={testTool.isPending}
              />
            </div>
          </div>

          {/* Session history accordion */}
          {history.length > 0 && (
            <div className="rounded-xl bg-card shadow-sm">
              <button
                type="button"
                onClick={() => setHistoryOpen((prev) => !prev)}
                className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-accent/50 rounded-xl"
              >
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Session History (
                  <span className="tabular-nums">{history.length}</span>)
                </h3>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    historyOpen && "rotate-180",
                  )}
                />
              </button>
              {historyOpen && (
                <div className="border-t border-border/40 px-6 pb-6">
                  <SessionHistory entries={history} />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
