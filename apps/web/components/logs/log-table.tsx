"use client";

import { useState } from "react";
import type { RequestLog } from "@apifold/types";
import { Badge } from "@apifold/ui";
import { cn } from "@apifold/ui";
import { ChevronRight } from "lucide-react";
import { METHOD_BADGE_VARIANTS } from "@/lib/constants";

interface LogTableProps {
  readonly logs: readonly RequestLog[];
  readonly onSelectLog?: (log: RequestLog) => void;
}

function statusVariant(code: number): "success" | "warning" | "error" {
  if (code < 300) return "success";
  if (code < 500) return "warning";
  return "error";
}

function LogDetail({ log }: { readonly log: RequestLog }) {
  const reqBody = log.requestBody;
  const resBody = log.responseBody;
  const headers = log.requestHeaders;

  return (
    <div className="border-t border-border bg-muted/20">
      <div className="grid grid-cols-2 gap-px bg-border/50 sm:grid-cols-4">
        {[
          { label: "Request ID", value: log.requestId },
          { label: "Tool", value: log.toolName ?? "—" },
          { label: "Path", value: log.path },
          ...(log.errorMessage ? [{ label: "Error", value: log.errorMessage }] : []),
        ].map((item) => (
          <div key={item.label} className="bg-background px-4 py-2">
            <dt className="text-[11px] text-muted-foreground">{item.label}</dt>
            <dd className={cn(
              "mt-0.5 truncate font-mono text-xs",
              item.label === "Error" && "text-destructive",
            )}>
              {item.value}
            </dd>
          </div>
        ))}
      </div>

      {headers && Object.keys(headers).length > 0 && (
        <div className="border-t border-border">
          <div className="px-4 py-1.5 text-[11px] font-medium text-muted-foreground border-b border-border">Request Headers</div>
          <pre className="px-4 py-3 font-mono text-xs leading-relaxed">
            {Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join("\n")}
          </pre>
        </div>
      )}

      {reqBody && Object.keys(reqBody as Record<string, unknown>).length > 0 && (
        <div className="border-t border-border">
          <div className="px-4 py-1.5 text-[11px] font-medium text-muted-foreground border-b border-border">Request Body</div>
          <pre className="max-h-48 overflow-auto px-4 py-3 font-mono text-xs leading-relaxed">
            {JSON.stringify(reqBody, null, 2)}
          </pre>
        </div>
      )}

      {resBody && (
        <div className="border-t border-border">
          <div className="px-4 py-1.5 text-[11px] font-medium text-muted-foreground border-b border-border">Response</div>
          <pre className="max-h-56 overflow-auto px-4 py-3 font-mono text-xs leading-relaxed">
            {(() => { try { return JSON.stringify(JSON.parse(resBody), null, 2); } catch { return resBody; } })()}
          </pre>
        </div>
      )}
    </div>
  );
}

export function LogTable({ logs }: LogTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span className="w-4" />
        <span className="w-14">Method</span>
        <span className="flex-1">Tool</span>
        <span className="w-16 text-right">Status</span>
        <span className="w-20 text-right">Duration</span>
        <span className="w-40 text-right hidden sm:block">Time</span>
      </div>

      {/* Rows */}
      {logs.map((log) => {
        const isExpanded = expandedId === log.id;
        return (
          <div key={log.id} className={cn(isExpanded && "bg-muted/10")}>
            <div
              className="flex items-center gap-4 px-4 py-2.5 cursor-pointer transition-colors duration-150 hover:bg-muted/30"
              onClick={() => setExpandedId(isExpanded ? null : log.id)}
            >
              <ChevronRight className={cn(
                "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
                isExpanded && "rotate-90",
              )} />
              <span className="w-14">
                <Badge variant={METHOD_BADGE_VARIANTS[log.method as keyof typeof METHOD_BADGE_VARIANTS] ?? "info"}>
                  {log.method}
                </Badge>
              </span>
              <span className="flex-1 truncate">
                <span className="font-mono text-xs">{log.toolName ?? log.path}</span>
                {log.errorMessage && (
                  <span className="ml-2 text-xs text-destructive">{log.errorMessage}</span>
                )}
              </span>
              <span className="w-16 text-right">
                <Badge variant={statusVariant(log.statusCode)} className="tabular-nums">
                  {log.statusCode}
                </Badge>
              </span>
              <span className="w-20 text-right text-xs text-muted-foreground tabular-nums">
                {log.durationMs}ms
              </span>
              <span className="w-40 text-right text-xs text-muted-foreground hidden sm:block">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>
            {isExpanded && <LogDetail log={log} />}
          </div>
        );
      })}
    </div>
  );
}
