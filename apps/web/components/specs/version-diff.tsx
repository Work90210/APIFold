import { Badge, StatusDot } from "@apifold/ui";
import type { SpecDiff, ToolChange, FieldChange } from "@/lib/diff/spec-diff";

interface VersionDiffProps {
  readonly diff: SpecDiff;
}

const TYPE_DOT_VARIANT = {
  added: "online",
  removed: "error",
  modified: "warning",
} as const;

const TYPE_LABEL = {
  added: "added",
  removed: "removed",
  modified: "modified",
} as const;

const TYPE_BADGE_VARIANT = {
  added: "success",
  removed: "destructive",
  modified: "warning",
} as const;

function FieldChangeRow({ change }: { readonly change: FieldChange }) {
  const fromValue = change.from === undefined ? "—" : String(change.from);
  const toValue = change.to === undefined ? "—" : String(change.to);

  return (
    <div className="flex items-center gap-2 py-1 pl-6 text-xs text-muted-foreground">
      <span className="font-mono">{change.field}</span>
      <span className="text-status-error line-through">{fromValue}</span>
      <span className="text-muted-foreground/60">&rarr;</span>
      <span className="text-status-success">{toValue}</span>
    </div>
  );
}

function ToolChangeRow({ tool }: { readonly tool: ToolChange }) {
  return (
    <div className="border-b border-border/50 last:border-b-0">
      <div className="flex items-center gap-3 px-4 py-2">
        <StatusDot variant={TYPE_DOT_VARIANT[tool.type]} />
        <span className="flex-1 truncate font-mono text-sm">{tool.name}</span>
        <Badge
          variant={TYPE_BADGE_VARIANT[tool.type]}
          className="text-[10px] px-1.5 py-0"
        >
          {TYPE_LABEL[tool.type]}
        </Badge>
        {(tool.breaking || tool.type === "removed") && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
            BREAKING
          </Badge>
        )}
      </div>
      {tool.changes && tool.changes.length > 0 && (
        <div className="pb-2">
          {tool.changes.map((change) => (
            <FieldChangeRow key={change.field} change={change} />
          ))}
        </div>
      )}
    </div>
  );
}

function VersionDiff({ diff }: VersionDiffProps) {
  if (diff.tools.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-muted-foreground">
        No tool changes in this version.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/20">
      {diff.tools.map((tool) => (
        <ToolChangeRow key={`${tool.type}-${tool.name}`} tool={tool} />
      ))}
    </div>
  );
}

export { VersionDiff };
