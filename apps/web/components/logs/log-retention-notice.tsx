import { Info } from "lucide-react";

interface LogRetentionNoticeProps {
  readonly retentionDays?: number;
}

export function LogRetentionNotice({
  retentionDays = 30,
}: LogRetentionNoticeProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
      <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
      <p className="text-sm text-muted-foreground leading-normal">
        Logs are retained for{" "}
        <span className="font-medium text-foreground tabular-nums">
          {retentionDays} days
        </span>{" "}
        on your current plan.
      </p>
    </div>
  );
}
