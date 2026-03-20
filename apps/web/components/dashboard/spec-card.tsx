"use client";

import Link from "next/link";
import { FileJson, ArrowRight } from "lucide-react";
import type { Spec } from "@apifold/types";
import { cn } from "@apifold/ui";

interface SpecCardProps {
  readonly spec: Spec;
  readonly index?: number;
}

export function SpecCard({ spec, index = 0 }: SpecCardProps) {
  return (
    <Link href={`/dashboard/specs/${spec.id}`} className="group block">
      <div
        className={cn(
          "rounded-xl bg-card shadow-sm p-5",
          "transition-shadow duration-200",
          "hover:shadow-md",
          "animate-stagger-in",
        )}
        style={{ "--i": index } as React.CSSProperties}
      >
        <div className="flex items-start gap-4">
          <FileJson className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold font-heading text-base leading-tight truncate">
              {spec.name}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">v{spec.version}</p>
          </div>
          <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground tabular-nums">
            {spec.toolCount} tools
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
          <span className="text-xs text-muted-foreground tabular-nums">
            {new Date(spec.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground opacity-0 translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
            View details
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
