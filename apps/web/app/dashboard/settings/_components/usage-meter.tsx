import { cn } from "@apifold/ui";
import { AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface UsageMeterProps {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly current: number;
  readonly max: number;
}

export function UsageMeter({ label, icon: Icon, current, max }: UsageMeterProps) {
  const isUnlimited = !Number.isFinite(max) || max <= 0;
  const percent = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
  const isWarning = percent >= 70 && percent < 90;
  const isCritical = percent >= 90;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          {label}
        </span>
        <span className="font-semibold tabular-nums">
          {current.toLocaleString()}
          <span className="font-normal text-muted-foreground">
            {" / "}
            {isUnlimited ? "Unlimited" : max.toLocaleString()}
          </span>
        </span>
      </div>

      {!isUnlimited && (
        <div
          className="h-2.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={current}
          aria-valuemax={max}
          aria-label={`${label}: ${current} of ${max}`}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out-expo",
              isCritical
                ? "bg-destructive"
                : isWarning
                  ? "bg-amber-500"
                  : "bg-primary",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {isCritical && percent >= 100 && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertTriangle className="h-3 w-3" />
          Limit reached
        </p>
      )}

      {isWarning && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {Math.round(100 - percent)}% remaining
        </p>
      )}
    </div>
  );
}
