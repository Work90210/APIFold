"use client";

import type { McpServer } from "@apifold/types";
import { CodeBlock } from "@apifold/ui";
import { Monitor, Code2 } from "lucide-react";

interface SnippetCopierProps {
  readonly server: McpServer;
  readonly domain?: string;
}

export function SnippetCopier({
  server,
  domain = "your-domain.com",
}: SnippetCopierProps) {
  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        [server.slug]: {
          command: "npx",
          args: [
            "-y",
            "@modelcontextprotocol/server-sse-client",
            `https://${domain}/mcp/${server.slug}/sse`,
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
          url: `https://${domain}/mcp/${server.slug}/sse`,
        },
      },
    },
    null,
    2,
  );

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-card shadow-sm p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <Monitor className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold font-heading text-sm">Claude Desktop</h3>
        </div>
        <CodeBlock
          code={claudeConfig}
          language="json"
          title="claude_desktop_config.json"
        />
      </div>

      <div className="rounded-xl bg-card shadow-sm p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold font-heading text-sm">Cursor</h3>
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
