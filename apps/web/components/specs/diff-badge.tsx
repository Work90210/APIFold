import { Badge } from "@apifold/ui";
import type { SpecDiff } from "@/lib/diff/spec-diff";

interface DiffBadgeProps {
  readonly diff: SpecDiff;
}

function DiffBadge({ diff }: DiffBadgeProps) {
  if (diff.addedCount === 0 && diff.removedCount === 0 && diff.modifiedCount === 0) {
    return <span className="text-xs text-muted-foreground">No changes</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-xs">
        {diff.addedCount > 0 && (
          <span className="text-status-success">+{diff.addedCount}</span>
        )}
        {diff.removedCount > 0 && (
          <span className="ml-1 text-status-error">-{diff.removedCount}</span>
        )}
        {diff.modifiedCount > 0 && (
          <span className="ml-1 text-status-warning">~{diff.modifiedCount}</span>
        )}
      </span>
      {diff.isBreaking && (
        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
          BREAKING
        </Badge>
      )}
    </span>
  );
}

export { DiffBadge };
