"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button, EmptyState } from "@apifold/ui";
import { useSpecs } from "@/lib/hooks";
import { SpecCard } from "@/components/dashboard/spec-card";
import { SpecCardSkeleton } from "@/components/dashboard/spec-card-skeleton";

export default function SpecsPage() {
  const { data: specs, status, fetchStatus } = useSpecs();

  const showSkeleton = status === "pending" && fetchStatus === "fetching";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-fluid-2xl font-bold font-heading tracking-tight">
            Specs
          </h1>
          <p className="text-muted-foreground">
            Manage your imported OpenAPI specifications.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/specs/new">
            <Plus className="mr-2 h-4 w-4" />
            Import Spec
          </Link>
        </Button>
      </div>

      {showSkeleton ? (
        <div className="grid-auto-fill gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SpecCardSkeleton key={i} />
          ))}
        </div>
      ) : specs && specs.length > 0 ? (
        <div className="grid-auto-fill gap-4">
          {specs.map((spec, index) => (
            <SpecCard key={spec.id} spec={spec} index={index} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No specs imported yet"
          description="Import an OpenAPI spec to get started. We'll automatically generate MCP tools from your API."
          action={
            <Button asChild>
              <Link href="/dashboard/specs/new">
                <Plus className="mr-2 h-4 w-4" />
                Import Your First Spec
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
