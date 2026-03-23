"use client";

import type { McpServer } from "@apifold/types";
import { CodeBlock } from "@apifold/ui";
import { Monitor, Code2 } from "lucide-react";

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "apifold.dev";

interface SnippetCopierProps {
  readonly server: McpServer;
}

export function SnippetCopier({ server }: SnippetCopierProps) {
  // Use custom domain if verified, otherwise use platform domain + endpoint ID
  const domain = server.customDomain && server.domainVerifiedAt
    ? server.customDomain
    : PLATFORM_DOMAIN;

  const mcpUrl = server.customDomain && server.domainVerifiedAt
    ? `https://${domain}/sse`
    : `https://${domain}/mcp/${server.endpointId}/sse`;

  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        [server.slug]: {
          command: "npx",
          args: [
            "-y",
            "@modelcontextprotocol/server-sse-client",
            mcpUrl,
          ],
        },
      },
    },
    null,
    2,
  );

  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        [server.slug]: {
          url: mcpUrl,
        },
      },
    },
    null,
    2,
  );

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <Monitor className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Claude Desktop</h3>
        </div>
        <CodeBlock
          code={claudeConfig}
          language="json"
          title="claude_desktop_config.json"
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Cursor</h3>
        </div>
        <CodeBlock
          code={cursorConfig}
          language="json"
          title=".cursor/mcp.json"
        />
      </div>
    </div>
  );
}
