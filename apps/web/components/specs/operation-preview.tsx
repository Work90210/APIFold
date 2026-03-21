import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@apifold/ui";
import { METHOD_BADGE_VARIANTS } from "@/lib/constants";

interface Operation {
  readonly method: string;
  readonly path: string;
  readonly summary?: string;
  readonly toolName: string;
}

interface OperationPreviewProps {
  readonly operations: readonly Operation[];
  readonly specName: string;
}

export function OperationPreview({ operations, specName }: OperationPreviewProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-fluid-xl font-semibold font-heading tracking-tight">
          {specName}
        </h3>
        <p className="text-sm text-muted-foreground leading-normal">
          <span className="tabular-nums">{operations.length}</span> operations
          detected
        </p>
      </div>
      <div className="overflow-hidden rounded-xl bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Method</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Tool Name</TableHead>
              <TableHead className="hidden md:table-cell">Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {operations.map((op, index) => (
              <TableRow
                key={`${op.method}-${op.path}`}
                className="animate-stagger-in"
                style={{ "--i": index } as React.CSSProperties}
              >
                <TableCell>
                  <Badge
                    variant={METHOD_BADGE_VARIANTS[op.method as keyof typeof METHOD_BADGE_VARIANTS] ?? "default"}
                    className="font-mono text-[10px] font-bold"
                  >
                    {op.method}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{op.path}</TableCell>
                <TableCell className="font-mono text-xs">{op.toolName}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {op.summary ?? "\u2014"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
