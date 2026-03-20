import { Info } from "lucide-react";

interface LogRetentionNoticeProps {
  readonly retentionDays?: number;
}

export function LogRetentionNotice({
  retentionDays = 30,
}: LogRetentionNoticeProps) {
  return (
    <div className="flex items-center gap-3 overflow-hidden rounded-2xl border bg-status-info/5 px-5 py-4"
      style={{
        borderLeft: "3px solid transparent",
        borderImage: "linear-gradient(to bottom, hsl(var(--status-info)), hsl(var(--brand-500))) 1",
        borderImageSlice: "0 0 0 1",
      }}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-status-info/10">
        <Info className="h-4 w-4 text-status-info" />
      </div>
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
