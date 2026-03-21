import {
  Shield,
  LayoutDashboard,
  FileJson,
  Brain,
  Terminal,
} from "lucide-react";

export function FeaturesGrid() {
  return (
    <section
      id="features"
      className="relative border-t border-[#40485d]/50 px-6 py-28 md:py-36"
    >
      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a7a5ff]">
            Features
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Built for Production AI
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-[#a3aac4]">
            Enterprise-grade security, real-time observability, and multi-client
            support &mdash; all in a single self-hostable stack.
          </p>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {/* Large security card — spans 2 columns */}
          <div className="glass-panel rounded-2xl border border-[#40485d]/30 bg-[#0f1930]/60 p-6 md:col-span-2 transition-all duration-300 hover:-translate-y-0.5">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#645efb]/15 to-[#a7a5ff]/15 ring-1 ring-white/10">
                  <Shield className="h-5 w-5 text-[#a7a5ff]" />
                </div>
                <h3 className="font-heading text-lg font-semibold tracking-tight text-white">
                  Secure-by-Default
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#a3aac4]">
                  Every connection encrypted, every credential vaulted, every
                  request validated before it touches your API.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["AES-256", "ZERO-KNOWLEDGE", "SSRF PROTECTION"].map(
                    (tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#a7a5ff]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#a7a5ff] ring-1 ring-[#a7a5ff]/20"
                      >
                        {tag}
                      </span>
                    ),
                  )}
                </div>
              </div>
              <div className="hidden items-center justify-center md:flex">
                <div
                  className="h-48 w-full rounded-2xl bg-gradient-to-br from-[#645efb]/20 to-[#53ddfc]/20"
                  role="img"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>

          {/* Dashboard card */}
          <div className="glass-panel rounded-2xl border border-[#40485d]/30 bg-[#0f1930]/60 p-6 transition-all duration-300 hover:-translate-y-0.5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#645efb]/15 to-[#a7a5ff]/15 ring-1 ring-white/10">
              <LayoutDashboard className="h-5 w-5 text-[#a7a5ff]" />
            </div>
            <h3 className="font-heading text-lg font-semibold tracking-tight text-white">
              Visual Dashboard
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#a3aac4]">
              Import specs, manage tools, monitor connections, and configure auth
              — all from a single pane of glass.
            </p>
            <div
              className="mt-4 flex h-16 items-end gap-1"
              role="img"
              aria-hidden="true"
            >
              {[30, 50, 40, 70, 55, 80, 65, 90, 100].map((h, i) => (
                <div
                  key={i}
                  className="w-3 rounded-t bg-[#a7a5ff]"
                  style={{
                    height: `${h}%`,
                    opacity: 0.2 + (i / 8) * 0.8,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Three small cards */}
          <div className="glass-panel rounded-2xl border border-[#40485d]/30 bg-[#0f1930]/60 p-6 transition-all duration-300 hover:-translate-y-0.5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#645efb]/15 to-[#a7a5ff]/15 ring-1 ring-white/10">
              <FileJson className="h-5 w-5 text-[#a7a5ff]" />
            </div>
            <h3 className="font-heading text-lg font-semibold tracking-tight text-white">
              Any OpenAPI Spec
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#a3aac4]">
              Drop in any spec and watch it transform. Every endpoint becomes a
              callable MCP tool with typed parameters.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["OPENAPI 3.0", "OPENAPI 3.1", "SWAGGER 2.0"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#a7a5ff]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#a7a5ff] ring-1 ring-[#a7a5ff]/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-[#40485d]/30 bg-[#0f1930]/60 p-6 transition-all duration-300 hover:-translate-y-0.5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#645efb]/15 to-[#a7a5ff]/15 ring-1 ring-white/10">
              <Brain className="h-5 w-5 text-[#a7a5ff]" />
            </div>
            <h3 className="font-heading text-lg font-semibold tracking-tight text-white">
              Every AI Agent
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#a3aac4]">
              Claude Desktop, Cursor, Windsurf, Continue — if it speaks MCP, it
              works with APIFold. Standard SSE transport.
            </p>
          </div>

          <div className="glass-panel rounded-2xl border border-[#40485d]/30 bg-[#0f1930]/60 p-6 transition-all duration-300 hover:-translate-y-0.5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#645efb]/15 to-[#a7a5ff]/15 ring-1 ring-white/10">
              <Terminal className="h-5 w-5 text-[#a7a5ff]" />
            </div>
            <h3 className="font-heading text-lg font-semibold tracking-tight text-white">
              Self-Hostable
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#a3aac4]">
              One command to deploy your entire stack. Your data stays on your
              infrastructure. No vendor lock-in.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["DOCKER COMPOSE", "ANY CLOUD"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#a7a5ff]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#a7a5ff] ring-1 ring-[#a7a5ff]/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
