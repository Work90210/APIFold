import { Skeleton } from "@apifold/ui";

export function ServerCardSkeleton() {
  return (
    <div className="rounded-xl bg-card shadow-sm p-5">
      {/* Header: icon + name/slug + status dot */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded" />
          <div>
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="mt-1.5 h-3 w-24 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-3 w-10 rounded" />
        </div>
      </div>
      {/* Meta row: three small pills */}
      <div className="mt-5 flex items-center gap-4 border-t border-border/40 pt-4">
        <Skeleton className="h-4 w-14 rounded-full" />
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-4 w-14 rounded-full" />
      </div>
    </div>
  );
}
