"use client";

import Link from "next/link";
import { Layers, Plus, ChevronRight } from "lucide-react";
import { Button, Skeleton, EmptyState, StatusDot, Badge } from "@apifold/ui";
import { cn } from "@apifold/ui";
import { useComposites } from "@/lib/hooks";

export default function CompositesPage() {
  const { data: composites, isLoading } = useComposites();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Composite Servers</h1>
        <Button size="sm" asChild>
          <Link href="/dashboard/composites/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Composite
          </Link>
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Composite servers merge tools from multiple MCP servers under a single endpoint with namespace prefixes.
      </p>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      ) : composites && composites.length > 0 ? (
        <div className="rounded-lg border border-border">
          {composites.map((composite, i) => (
            <Link
              key={composite.id}
              href={`/dashboard/composites/${composite.id}`}
              className={cn(
                "flex items-center gap-4 px-4 py-3 transition-colors duration-150 hover:bg-muted/30",
                i < composites.length - 1 && "border-b border-border/50",
              )}
            >
              <StatusDot variant={composite.isActive ? "online" : "offline"} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{composite.name}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{composite.slug}</p>
              </div>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                {composite.transport.toUpperCase()}
              </Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border p-12">
          <EmptyState
            icon={Layers}
            title="No composite servers"
            description="Create a composite server to merge tools from multiple MCP servers under one endpoint."
          />
        </div>
      )}
    </div>
  );
}
