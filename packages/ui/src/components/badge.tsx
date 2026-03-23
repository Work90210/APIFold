import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-ring",
  {
    variants: {
      variant: {
        default:
          "border-border text-foreground",
        secondary:
          "border-border text-muted-foreground",
        destructive:
          "border-destructive/20 text-destructive",
        outline: "border-border text-foreground",
        success:
          "border-status-success/20 text-status-success",
        warning:
          "border-status-warning/20 text-status-warning",
        error:
          "border-status-error/20 text-status-error",
        info:
          "border-status-info/20 text-status-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
