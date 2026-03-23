import { cn } from "../lib/utils";

type StatusDotVariant = "online" | "offline" | "warning" | "error";

interface StatusDotProps {
  readonly variant: StatusDotVariant;
  readonly className?: string;
}

const VARIANT_CLASSES: Record<StatusDotVariant, string> = {
  online: "bg-status-success",
  offline: "bg-muted-foreground/40",
  warning: "bg-status-warning",
  error: "bg-status-error",
};

function StatusDot({ variant, className }: StatusDotProps) {
  return (
    <span
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", VARIANT_CLASSES[variant], className)}
      aria-label={variant}
    />
  );
}

export { StatusDot, type StatusDotVariant };
