import type { RequestLog } from "@apifold/types";
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@apifold/ui";
import { METHOD_BADGE_VARIANTS } from "@/lib/constants";

interface LogTableProps {
  readonly logs: readonly RequestLog[];
  readonly onSelectLog: (log: RequestLog) => void;
}

function statusVariant(code: number): "success" | "warning" | "error" {
  if (code < 300) return "success";
  if (code < 500) return "warning";
  return "error";
}

export function LogTable({ logs, onSelectLog }: LogTableProps) {
  return (
    <div className="rounded-md border responsive-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky top-0 w-20">Method</TableHead>
            <TableHead className="sticky top-0">Path</TableHead>
            <TableHead className="sticky top-0 w-20">Status</TableHead>
            <TableHead className="sticky top-0 w-24">Duration</TableHead>
            <TableHead className="sticky top-0 w-40">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow
              key={log.id}
              className="cursor-pointer"
              onClick={() => onSelectLog(log)}
            >
              <TableCell data-label="Method">
                <Badge variant={METHOD_BADGE_VARIANTS[log.method as keyof typeof METHOD_BADGE_VARIANTS] ?? "info"}>
                  {log.method}
                </Badge>
              </TableCell>
              <TableCell data-label="Path" className="max-w-xs truncate font-mono text-xs">
                {log.path}
              </TableCell>
              <TableCell data-label="Status">
                <Badge variant={statusVariant(log.statusCode)}>
                  {log.statusCode}
                </Badge>
              </TableCell>
              <TableCell data-label="Duration" className="text-muted-foreground tabular-nums">
                {log.durationMs}ms
              </TableCell>
              <TableCell data-label="Time" className="text-xs text-muted-foreground">
                {new Date(log.timestamp).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
