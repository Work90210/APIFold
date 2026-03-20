import { ExternalLink, Calendar, FileJson, Wrench } from "lucide-react";
import type { Spec } from "@apifold/types";
import { Badge } from "@apifold/ui";

interface SpecHeaderProps {
  readonly spec: Spec;
}

export function SpecHeader({ spec }: SpecHeaderProps) {
  return (
    <div className="rounded-xl bg-card shadow-sm p-6">
      <div className="flex items-start gap-4">
        <FileJson className="mt-0.5 h-6 w-6 shrink-0 text-muted-foreground" />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-fluid-3xl font-bold font-heading tracking-tight">
              {spec.name}
            </h1>
            <Badge variant="secondary" className="text-xs">
              v{spec.version}
            </Badge>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground leading-normal">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Imported{" "}
              <span className="tabular-nums">
                {new Date(spec.createdAt).toLocaleDateString()}
              </span>
            </span>
            {spec.sourceUrl && (
              <a
                href={spec.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-foreground transition-colors duration-200 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Source
              </a>
            )}
            <span className="flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5" />
              <span className="tabular-nums">{spec.toolCount}</span> tools
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
