"use client";

import { useState, useCallback, useMemo, use } from "react";
import { Play, Terminal, ChevronDown, Circle } from "lucide-react";
import { cn, Skeleton, EmptyState, Button, Badge } from "@apifold/ui";
import { useTools, useTestTool } from "@/lib/hooks";

interface JsonSchema {
  readonly type?: string;
  readonly properties?: Record<string, JsonSchema>;
  readonly required?: readonly string[];
  readonly description?: string;
  readonly default?: unknown;
  readonly enum?: readonly unknown[];
}

function buildTemplate(schema: JsonSchema): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const props = schema.properties ?? {};
  for (const [key, prop] of Object.entries(props)) {
    if (prop.default !== undefined) {
      result[key] = prop.default;
    } else if (prop.enum && prop.enum.length > 0) {
      result[key] = prop.enum[0];
    } else if (prop.type === "string") {
      result[key] = "";
    } else if (prop.type === "number" || prop.type === "integer") {
      result[key] = 0;
    } else if (prop.type === "boolean") {
      result[key] = false;
    } else if (prop.type === "array") {
      result[key] = [];
    } else if (prop.type === "object") {
      result[key] = {};
    } else {
      result[key] = null;
    }
  }
  return result;
}

interface HistoryEntry {
  readonly toolName: string;
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
  const [body, setBody] = useState("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [response, setResponse] = useState<{
    readonly content: unknown;
    readonly isError: boolean;
    readonly durationMs: number;
  } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const activeTools = tools?.filter((t) => t.isActive) ?? [];
  const selectedTool = tools?.find((t) => t.name === selectedToolName);
  const schema = selectedTool?.inputSchema as JsonSchema | undefined;
  const required = useMemo(() => new Set(schema?.required ?? []), [schema]);
  const properties = useMemo(() => Object.entries(schema?.properties ?? {}), [schema]);

  const handleSelectTool = useCallback((name: string) => {
    setSelectedToolName(name);
    setPickerOpen(false);
    setResponse(null);
    setJsonError(null);
    const tool = activeTools.find((t) => t.name === name);
    if (tool) {
      const template = buildTemplate(tool.inputSchema as JsonSchema);
      setBody(JSON.stringify(template, null, 2));
    }
  }, [activeTools]);

  const handleExecute = useCallback(() => {
    if (!selectedToolName) return;
    let parsed: Record<string, unknown>;
    try {
      const val: unknown = JSON.parse(body);
      if (typeof val !== "object" || val === null || Array.isArray(val)) {
        setJsonError("Body must be a JSON object");
        return;
      }
      parsed = val as Record<string, unknown>;
      setJsonError(null);
    } catch {
      setJsonError("Invalid JSON");
      return;
    }

    testTool.mutate(
      { serverId: id, toolName: selectedToolName, input: parsed },
      {
        onSuccess: (result) => {
          setResponse(result);
          setHistory((prev) => [
            { toolName: selectedToolName, isError: result.isError, durationMs: result.durationMs, timestamp: new Date() },
            ...prev.slice(0, 19),
          ]);
        },
        onError: (err) => {
          setResponse({
            content: { error: err instanceof Error ? err.message : "Request failed. Is the MCP runtime online?" },
            isError: true,
            durationMs: 0,
          });
        },
      },
    );
  }, [id, selectedToolName, body, testTool]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Console</h1>
        {history.length > 0 && (
          <div className="flex items-center gap-2">
            {history.slice(0, 5).map((h, i) => (
              <Circle
                key={i}
                className={cn("h-2 w-2 fill-current", h.isError ? "text-status-error" : "text-status-success")}
              />
            ))}
            <span className="text-xs text-muted-foreground tabular-nums">{history.length} calls</span>
          </div>
        )}
      </div>

      {toolsLoading ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : activeTools.length === 0 ? (
        <EmptyState icon={Terminal} title="No active tools" description="Enable tools to start testing." />
      ) : (
        <>
          {/* Tool picker + execute */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setPickerOpen((p) => !p)}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm transition-colors duration-150 hover:bg-muted/50"
              >
                <span className={cn("font-mono text-xs", !selectedToolName && "text-muted-foreground")}>
                  {selectedToolName ?? "Select tool..."}
                </span>
                <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-150", pickerOpen && "rotate-180")} />
              </button>
              {pickerOpen && (
                <div className="absolute left-0 top-full z-10 mt-1 max-h-60 w-80 overflow-auto rounded-lg border border-border bg-background">
                  {activeTools.map((tool) => (
                    <button
                      key={tool.name}
                      type="button"
                      onClick={() => handleSelectTool(tool.name)}
                      className={cn(
                        "flex w-full items-center justify-between px-3 py-2 text-left transition-colors duration-150 hover:bg-muted/30",
                        selectedToolName === tool.name && "bg-muted/50",
                      )}
                    >
                      <div className="min-w-0">
                        <span className="font-mono text-xs font-medium">{tool.name}</span>
                        {tool.description && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{tool.description}</p>
                        )}
                      </div>
                      <span className="ml-2 shrink-0 text-[10px] text-muted-foreground tabular-nums">
                        {Object.keys((tool.inputSchema as JsonSchema)?.properties ?? {}).length}p
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleExecute}
              disabled={!selectedToolName || testTool.isPending}
            >
              <Play className="mr-1.5 h-3 w-3" />
              {testTool.isPending ? "Running..." : "Execute"}
            </Button>
          </div>

          {/* Editor + Schema hints side by side */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* JSON editor — 2 cols */}
            <div className="lg:col-span-2 rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground">Request body</span>
                {jsonError && <span className="text-xs text-destructive">{jsonError}</span>}
              </div>
              <textarea
                value={body}
                onChange={(e) => { setBody(e.target.value); setJsonError(null); }}
                spellCheck={false}
                className="h-64 w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
                placeholder='{ }'
              />
            </div>

            {/* Schema reference — 1 col */}
            <div className="rounded-lg border border-border">
              <div className="border-b border-border px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground">Parameters</span>
              </div>
              <div className="p-3">
                {!selectedTool ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">Select a tool</p>
                ) : properties.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">No parameters</p>
                ) : (
                  <div className="space-y-2">
                    {properties.map(([key, prop]) => (
                      <div key={key} className="flex items-start justify-between gap-2 py-1">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-medium">{key}</span>
                            {required.has(key) && <span className="text-[10px] text-destructive">*</span>}
                          </div>
                          {prop.description && (
                            <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{prop.description}</p>
                          )}
                        </div>
                        <span className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {prop.type ?? "any"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Response */}
          {(response || testTool.isPending) && (
            <div className="rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground">Response</span>
                {response && (
                  <div className="flex items-center gap-2">
                    <Badge variant={response.isError ? "error" : "success"}>
                      {response.isError ? "Error" : "OK"}
                    </Badge>
                    <span className="text-xs text-muted-foreground tabular-nums">{response.durationMs}ms</span>
                  </div>
                )}
              </div>
              <div className="max-h-80 overflow-auto">
                {testTool.isPending ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
                  </div>
                ) : response ? (
                  <pre className="p-4 font-mono text-sm leading-relaxed">
                    {(() => {
                      const MAX_RESPONSE_SIZE = 50_000;
                      let raw: string;
                      try {
                        raw = JSON.stringify(response.content, null, 2) ?? '';
                      } catch {
                        raw = String(response.content);
                      }
                      return raw.length > MAX_RESPONSE_SIZE
                        ? `${raw.slice(0, MAX_RESPONSE_SIZE)}\n\n... (truncated — ${raw.length.toLocaleString()} chars total)`
                        : raw;
                    })()}
                  </pre>
                ) : null}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
