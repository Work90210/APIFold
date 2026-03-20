"use client";

import type { McpTool } from "@apifold/types";
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, CodeBlock } from "@apifold/ui";
import { useUpdateTool } from "@/lib/hooks";

interface ToolDetailProps {
  readonly tool: McpTool;
  readonly serverId: string;
}

export function ToolDetail({ tool, serverId }: ToolDetailProps) {
  const updateTool = useUpdateTool();

  const handleToggle = () => {
    updateTool.mutate({
      serverId,
      toolId: tool.id,
      input: { isActive: !tool.isActive },
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono text-lg font-semibold">{tool.name}</h2>
          {tool.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {tool.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={tool.isActive ? "success" : "secondary"}>
            {tool.isActive ? "Enabled" : "Disabled"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            disabled={updateTool.isPending}
          >
            {tool.isActive ? "Disable" : "Enable"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Input Schema</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={JSON.stringify(tool.inputSchema, null, 2)}
            language="json"
            title="inputSchema"
          />
        </CardContent>
      </Card>
    </div>
  );
}
