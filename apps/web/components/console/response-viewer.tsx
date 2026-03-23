import { CodeBlock, Badge } from "@apifold/ui";

interface ResponseViewerProps {
  readonly response: {
    readonly content: unknown;
    readonly isError: boolean;
    readonly durationMs: number;
  } | null;
  readonly isLoading: boolean;
}

export function ResponseViewer({ response, isLoading }: ResponseViewerProps) {
  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg bg-muted/30">
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
          <p className="text-sm text-muted-foreground">Executing...</p>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border/40">
        <p className="text-sm text-muted-foreground leading-normal">
          Execute a tool to see the response
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant={response.isError ? "error" : "success"}>
            {response.isError ? "Error" : "Success"}
          </Badge>
          <span className="text-xs text-muted-foreground tabular-nums">
            {response.durationMs}ms
          </span>
        </div>
        <CodeBlock
          code={JSON.stringify(response.content, null, 2)}
          language="json"
          title="Response"
        />
      </div>
    </div>
  );
}
