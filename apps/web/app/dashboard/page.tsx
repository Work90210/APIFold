"use client";

import Link from "next/link";
import { Plus, FileJson } from "lucide-react";
import { Button, EmptyState } from "@apifold/ui";
import { useSpecs, useRuntimeHealth } from "@/lib/hooks";
import { StatsRow } from "@/components/dashboard/stats-row";
import { SpecCard } from "@/components/dashboard/spec-card";
import { SpecCardSkeleton } from "@/components/dashboard/spec-card-skeleton";

export default function DashboardPage() {
  const { data: specs, status, fetchStatus } = useSpecs();
  const { isOnline, isLoading: isHealthLoading } = useRuntimeHealth();

  const showSkeleton = status === "pending" && fetchStatus === "fetching";

  return (
    <div className="space-y-8 animate-in">
      {/* Welcome hero */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-fluid-3xl font-bold font-heading tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mt-1.5 text-muted-foreground max-w-prose leading-normal">
            Here&apos;s an overview of your MCP infrastructure.
          </p>
          {!isHealthLoading && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
              />
              {isOnline ? "MCP Runtime Online" : "MCP Runtime Offline"}
            </div>
          )}
        </div>
        <Button
          asChild
          size="lg"
          className="rounded-lg self-start sm:self-auto"
        >
          <Link href="/dashboard/specs/new">
            Import Spec
          </Link>
        </Button>
      </div>

      <StatsRow />

      {/* Section divider */}
      <div className="border-t border-border/40" />

      <div>
        <h2 className="mb-5 text-lg font-semibold font-heading tracking-tight">
          Your Specs
        </h2>
        {showSkeleton ? (
          <div className="grid-auto-fill gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <SpecCardSkeleton key={i} />
            ))}
          </div>
        ) : specs && specs.length > 0 ? (
          <div className="grid-auto-fill gap-5">
            {specs.map((spec, index) => (
              <SpecCard key={spec.id} spec={spec} index={index} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileJson}
            title="No specs imported yet"
            description="Import an OpenAPI spec to get started. We'll automatically generate MCP tools from your API."
            action={
              <Button
                asChild
                size="lg"
                className="rounded-lg"
              >
                <Link href="/dashboard/specs/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Import Your First Spec
                </Link>
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
