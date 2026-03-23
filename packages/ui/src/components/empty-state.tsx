import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "../lib/utils";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly icon?: LucideIcon;
  readonly title: string;
  readonly description?: string;
  readonly action?: React.ReactNode;
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-16 text-center",
        className,
      )}
      {...props}
    >
      {Icon && (
        <Icon className="h-6 w-6 text-muted-foreground/50" />
      )}
      <h3 className="mt-3 text-sm font-medium text-foreground">
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-normal">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export { EmptyState };
