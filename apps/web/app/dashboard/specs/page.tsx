"use client";

import Link from "next/link";
import { Plus, FileJson } from "lucide-react";
import { Button, EmptyState } from "@apifold/ui";
import { useSpecs } from "@/lib/hooks";
import { SpecCard } from "@/components/dashboard/spec-card";
import { SpecCardSkeleton } from "@/components/dashboard/spec-card-skeleton";

export default function SpecsPage() {
  const { data: specs, status, fetchStatus } = useSpecs();

  const showSkeleton = status === "pending" && fetchStatus === "fetching";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Specs</h1>
        <Button asChild size="sm">
          <Link href="/dashboard/specs/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Import Spec
          </Link>
        </Button>
      </div>

      {showSkeleton ? (
        <div>
          {Array.from({ length: 3 }).map((_, i) => (
            <SpecCardSkeleton key={i} />
          ))}
        </div>
      ) : specs && specs.length > 0 ? (
        <div>
          {specs.map((spec) => (
            <SpecCard key={spec.id} spec={spec} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileJson}
          title="No specs yet"
          description="Import an OpenAPI spec to generate MCP tools from your API."
          action={
            <Button asChild size="sm">
              <Link href="/dashboard/specs/new">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Import Spec
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
