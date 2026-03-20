import type { RequestLog } from "@apifold/types";
import {
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@apifold/ui";

interface LogDetailModalProps {
  readonly log: RequestLog | null;
  readonly open: boolean;
  readonly onClose: () => void;
}

export function LogDetailModal({ log, open, onClose }: LogDetailModalProps) {
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading tracking-tight">
            {log.method} {log.path}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs leading-normal">
            Request ID: {log.requestId}
          </DialogDescription>
        </DialogHeader>

        <div className="gradient-divider" />

        <dl className="grid gap-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <Badge
                variant={log.statusCode < 400 ? "success" : "error"}
                className="tabular-nums"
              >
                {log.statusCode}
              </Badge>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Duration</dt>
            <dd className="tabular-nums">{log.durationMs}ms</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Timestamp</dt>
            <dd className="tabular-nums">
              {new Date(log.timestamp).toLocaleString()}
            </dd>
          </div>
          {log.toolId && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tool ID</dt>
              <dd className="font-mono text-xs">{log.toolId}</dd>
            </div>
          )}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
