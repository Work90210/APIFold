import { Skeleton } from "@apifold/ui";

export function SpecCardSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-border py-3">
      <Skeleton className="h-4 w-4 shrink-0" />
      <Skeleton className="h-4 w-48" />
      <div className="flex-1" />
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}
