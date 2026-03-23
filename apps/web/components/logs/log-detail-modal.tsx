import type { RequestLog } from "@apifold/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@apifold/ui";
import { cn } from "@apifold/ui";

interface LogDetailModalProps {
  readonly log: RequestLog | null;
  readonly open: boolean;
  readonly onClose: () => void;
}

function CodeBlock({ label, content }: { readonly label: string; readonly content: string }) {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      </div>
      <pre className="max-h-56 overflow-auto p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
        {content}
      </pre>
    </div>
  );
}

export function LogDetailModal({ log, open, onClose }: LogDetailModalProps) {
  if (!log) return null;

  const reqBody = log.requestBody;
  const resBody = log.responseBody;
  const headers = log.requestHeaders;
  const isError = log.statusCode >= 400;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl rounded-lg p-0 gap-0 max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-3 text-sm font-normal tracking-tight">
            <span className={cn(
              "font-mono text-xs font-semibold tabular-nums",
              isError ? "text-destructive" : "text-status-success",
            )}>
              {log.statusCode}
            </span>
            <span className="font-mono text-xs">{log.method}</span>
            <span className="font-medium">{log.toolName ?? log.path}</span>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">{log.durationMs}ms</span>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1">
          {/* Key-value metadata */}
          <div className="grid grid-cols-2 gap-px bg-border">
            {[
              { label: "Time", value: new Date(log.timestamp).toLocaleString() },
              { label: "Request ID", value: log.requestId, mono: true },
              { label: "Tool", value: log.toolName ?? "—", mono: true },
              { label: "Path", value: log.path, mono: true },
              ...(log.errorMessage ? [{ label: "Error", value: log.errorMessage, error: true }] : []),
            ].map((item) => (
              <div key={item.label} className="bg-background px-4 py-2.5">
                <dt className="text-[11px] text-muted-foreground">{item.label}</dt>
                <dd className={cn(
                  "mt-0.5 text-xs truncate",
                  'mono' in item && item.mono && "font-mono",
                  'error' in item && item.error && "text-destructive",
                )}>
                  {item.value}
                </dd>
              </div>
            ))}
          </div>

          {/* Headers */}
          {headers && Object.keys(headers).length > 0 && (
            <div className="border-t border-border">
              <CodeBlock
                label="Request Headers"
                content={Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join("\n")}
              />
            </div>
          )}

          {/* Request Body */}
          {reqBody && Object.keys(reqBody as Record<string, unknown>).length > 0 && (
            <div className="border-t border-border">
              <CodeBlock
                label="Request Body"
                content={JSON.stringify(reqBody, null, 2)}
              />
            </div>
          )}

          {/* Response Body */}
          {resBody && (
            <div className="border-t border-border">
              <CodeBlock
                label="Response"
                content={(() => { try { return JSON.stringify(JSON.parse(resBody), null, 2); } catch { return resBody; } })()}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
