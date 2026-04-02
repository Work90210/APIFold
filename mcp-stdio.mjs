import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "apifold", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_servers",
      description:
        "List all 18 free hosted APIFold MCP servers (GitHub, Stripe, Slack, OpenAI, Notion, and more). Each server proxies a REST API — bring your own API key.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "get_server_endpoint",
      description:
        "Get the SSE endpoint URL for a specific APIFold MCP server by slug.",
      inputSchema: {
        type: "object",
        properties: {
          slug: {
            type: "string",
            description:
              "The server slug (e.g. github, stripe, slack, openai, notion)",
          },
          userKey: {
            type: "string",
            description: "Your APIFold user key",
          },
        },
        required: ["slug", "userKey"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "list_servers") {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              servers: [
                "github",
                "stripe",
                "slack",
                "openai",
                "notion",
                "jira",
                "linear",
                "shopify",
                "twilio",
                "sendgrid",
                "hubspot",
                "zendesk",
                "asana",
                "trello",
                "airtable",
                "salesforce",
                "google-calendar",
                "discord",
              ],
              baseUrl: "https://apifold-runtime.fly.dev/mcp/{slug}/sse",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === "get_server_endpoint") {
    const { slug, userKey } = args;
    return {
      content: [
        {
          type: "text",
          text: `https://apifold-runtime.fly.dev/mcp/${slug}/sse?userKey=${userKey}`,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
