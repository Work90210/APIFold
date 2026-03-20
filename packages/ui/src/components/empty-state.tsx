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
        "flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center animate-fade-in",
        className,
      )}
      {...props}
    >
      {Icon && (
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent">
          <Icon className="h-6 w-6 text-accent-foreground" />
        </div>
      )}
      <h3 className="mt-4 text-lg font-semibold font-heading leading-tight">
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
