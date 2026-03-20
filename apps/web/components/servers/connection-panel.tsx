import type { McpServer } from "@apifold/types";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@apifold/ui";

interface ConnectionPanelProps {
  readonly server: McpServer;
}

export function ConnectionPanel({ server }: ConnectionPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Connection Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <Badge variant={server.isActive ? "success" : "error"}>
            {server.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Transport</span>
          <span className="text-sm font-mono">{server.transport}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Auth</span>
          <span className="text-sm">{server.authMode}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Slug</span>
          <span className="text-sm font-mono">{server.slug}</span>
        </div>
      </CardContent>
    </Card>
  );
}
