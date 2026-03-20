import { Skeleton } from "@apifold/ui";

export function SpecCardSkeleton() {
  return (
    <div className="rounded-xl bg-card shadow-sm p-5">
      {/* Header: icon + title/version + badge */}
      <div className="flex items-start gap-4">
        <Skeleton className="mt-0.5 h-5 w-5 shrink-0 rounded" />
        <div className="flex-1 min-w-0">
          <Skeleton className="h-4 w-36 rounded" />
          <Skeleton className="mt-2 h-3 w-12 rounded" />
        </div>
        <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
      </div>
      {/* Footer: date */}
      <div className="mt-4 border-t border-border/40 pt-4">
        <Skeleton className="h-3 w-24 rounded" />
      </div>
    </div>
  );
}
