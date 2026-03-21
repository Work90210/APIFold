export function TerminalDemo() {
  return (
    <div className="mcp-glow glass-panel rounded-2xl border border-[#40485d]/50 bg-[#0f1930]/80 p-6">
      {/* Card header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#645efb]/20 to-[#a7a5ff]/20 ring-1 ring-white/10">
            <svg
              className="h-4 w-4 text-[#a7a5ff]"
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
            <p className="text-sm font-semibold text-white">
              APIFold Runtime v1.0
            </p>
            <p className="text-xs text-[#a3aac4]">Live orchestrator</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
          <span className="text-xs text-emerald-400">Connected</span>
        </div>
      </div>

      {/* Input URL */}
      <div className="rounded-lg bg-[#060e20]/60 px-4 py-3 ring-1 ring-[#40485d]/50">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[#6d758c]">
          Input — OpenAPI Spec
        </p>
        <p className="truncate font-mono text-sm text-[#53ddfc]">
          https://petstore3.swagger.io/api/v3/openapi.json
        </p>
      </div>

      {/* Conversion beam */}
      <div className="my-3 flex items-center justify-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#a7a5ff]/30 to-transparent" />
        <svg
          className="h-4 w-4 rotate-90 text-[#a7a5ff]/60"
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
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#a7a5ff]/30 to-transparent" />
      </div>

      {/* Output MCP endpoint */}
      <div className="rounded-lg bg-[#060e20]/60 px-4 py-3 ring-1 ring-[#40485d]/50">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[#6d758c]">
          Output — MCP Endpoint
        </p>
        <p className="truncate font-mono text-sm text-emerald-400">
          mcp://localhost:3002/petstore/sse
        </p>
      </div>

      {/* Floating terminal snippet */}
      <div className="mt-4 rounded-xl bg-[#000000] p-4 ring-1 ring-[#40485d]/50">
        <div className="mb-2 flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-[#ff5f57]" />
          <div className="h-2 w-2 rounded-full bg-[#febc2e]" />
          <div className="h-2 w-2 rounded-full bg-[#28c840]" />
          <span className="ml-2 font-mono text-[9px] text-white/20">
            terminal
          </span>
        </div>
        <div className="terminal-typing font-mono text-[11px] leading-relaxed text-[#a3aac4]">
          <div className="terminal-line" style={{ animationDelay: "0s" }}>
            <span className="text-emerald-400">$</span>{" "}
            <span className="text-white">mcp connect</span> petstore
          </div>
          <div className="terminal-line" style={{ animationDelay: "1s" }}>
            <span className="text-[#53ddfc]">&gt; Mapping 19 methods...</span>
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
