"use client";

import Link from "next/link";
import { FileJson, ChevronRight } from "lucide-react";
import type { Spec } from "@apifold/types";

interface SpecCardProps {
  readonly spec: Spec;
  readonly index?: number;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function SpecCard({ spec }: SpecCardProps) {
  return (
    <Link
      href={`/dashboard/specs/${spec.id}`}
      className="group flex items-center gap-4 border-b border-border py-3 transition-colors duration-150 hover:bg-muted/30 -mx-3 px-3 last:border-0"
    >
      <FileJson className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{spec.name}</span>
      </div>
      <span className="text-xs text-muted-foreground font-mono tabular-nums">
        v{spec.version}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {spec.toolCount} tools
      </span>
      <span className="text-xs text-muted-foreground tabular-nums hidden sm:block">
        {timeAgo(spec.createdAt)}
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-colors duration-150 group-hover:text-foreground" />
    </Link>
  );
}
