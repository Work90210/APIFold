export function TerminalDemo() {
  return (
    <div className="rounded-lg border border-border p-6">
      {/* Card header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border">
            <svg
              className="h-4 w-4 text-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              APIFold Runtime v1.0
            </p>
            <p className="text-xs text-muted-foreground">Live orchestrator</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-emerald-400">Connected</span>
        </div>
      </div>

      {/* Input URL */}
      <div className="rounded-lg border border-border px-4 py-3">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Input — OpenAPI Spec
        </p>
        <p className="truncate font-mono text-sm text-primary">
          https://petstore3.swagger.io/api/v3/openapi.json
        </p>
      </div>

      {/* Conversion beam */}
      <div className="my-3 flex items-center justify-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <svg
          className="h-4 w-4 rotate-90 text-muted-foreground/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Output MCP endpoint */}
      <div className="rounded-lg border border-border px-4 py-3">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Output — MCP Endpoint
        </p>
        <p className="truncate font-mono text-sm text-emerald-400">
          mcp://localhost:3002/petstore/sse
        </p>
      </div>

      {/* Floating terminal snippet */}
      <div className="mt-4 rounded-lg border border-border bg-black p-4">
        <div className="mb-2 flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-[#ff5f57]" />
          <div className="h-2 w-2 rounded-full bg-[#febc2e]" />
          <div className="h-2 w-2 rounded-full bg-[#28c840]" />
          <span className="ml-2 font-mono text-[9px] text-muted-foreground/40">
            terminal
          </span>
        </div>
        <div className="terminal-typing font-mono text-[11px] leading-relaxed text-muted-foreground">
          <div className="terminal-line" style={{ animationDelay: "0s" }}>
            <span className="text-emerald-400">$</span>{" "}
            <span className="text-foreground">mcp connect</span> petstore
          </div>
          <div className="terminal-line" style={{ animationDelay: "1s" }}>
            <span className="text-primary">&gt; Mapping 19 methods...</span>
          </div>
          <div className="terminal-line" style={{ animationDelay: "2s" }}>
            <span className="text-emerald-400">
              &gt; Protocol: SSE + JSON-RPC
            </span>
          </div>
          <div className="terminal-line" style={{ animationDelay: "3s" }}>
            <span className="text-emerald-400">
              &gt; Server ready at :3002
            </span>
          </div>
        </div>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .terminal-line {
                opacity: 0;
                animation: termFadeIn 10s ease-out infinite;
              }
              @keyframes termFadeIn {
                0%, 10% { opacity: 0; transform: translateY(4px); }
                15%, 85% { opacity: 1; transform: translateY(0); }
                90%, 100% { opacity: 0; }
              }
            `,
          }}
        />
      </div>
    </div>
  );
}
