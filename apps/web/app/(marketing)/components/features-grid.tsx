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
      className="relative border-t border-border px-6 py-28 md:py-36"
    >
      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Built for Production AI
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted-foreground">
            Enterprise-grade security, real-time observability, and multi-client
            support &mdash; all in a single self-hostable stack.
          </p>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {/* Large security card — spans 2 columns */}
          <div className="rounded-lg border border-border p-6 md:col-span-2 transition-all duration-300 hover:-translate-y-0.5">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-border">
                  <Shield className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  Secure-by-Default
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Every connection encrypted, every credential vaulted, every
                  request validated before it touches your API.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["AES-256", "ZERO-KNOWLEDGE", "SSRF PROTECTION"].map(
                    (tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ),
                  )}
                </div>
              </div>
              <div className="hidden items-center justify-center md:flex">
                <div
                  className="flex h-48 w-full flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/30"
                  role="img"
                  aria-hidden="true"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                    <div className="h-1 w-24 rounded-full bg-emerald-500/40" />
                    <span className="font-mono text-[10px] text-emerald-500/80">ENCRYPTED</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                    <div className="h-1 w-20 rounded-full bg-emerald-500/40" />
                    <span className="font-mono text-[10px] text-emerald-500/80">VAULTED</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                    <div className="h-1 w-28 rounded-full bg-emerald-500/40" />
                    <span className="font-mono text-[10px] text-emerald-500/80">VALIDATED</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1">
                    <Shield className="h-3 w-3 text-emerald-500" />
                    <span className="font-mono text-[10px] font-medium text-emerald-500">ALL CHECKS PASSED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard card */}
          <div className="rounded-lg border border-border p-6 transition-all duration-300 hover:-translate-y-0.5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-border">
              <LayoutDashboard className="h-5 w-5 text-foreground" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              Visual Dashboard
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
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
                  className="w-3 rounded-t bg-foreground"
                  style={{
                    height: `${h}%`,
                    opacity: 0.2 + (i / 8) * 0.8,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Three small cards */}
          <div className="rounded-lg border border-border p-6 transition-all duration-300 hover:-translate-y-0.5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-border">
              <FileJson className="h-5 w-5 text-foreground" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              Any OpenAPI Spec
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Drop in any spec and watch it transform. Every endpoint becomes a
              callable MCP tool with typed parameters.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["OPENAPI 3.0", "OPENAPI 3.1", "SWAGGER 2.0"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border p-6 transition-all duration-300 hover:-translate-y-0.5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-border">
              <Brain className="h-5 w-5 text-foreground" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              Every AI Agent
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Claude Desktop, Cursor, Windsurf, Continue — if it speaks MCP, it
              works with APIFold. Standard SSE transport.
            </p>
          </div>

          <div className="rounded-lg border border-border p-6 transition-all duration-300 hover:-translate-y-0.5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-border">
              <Terminal className="h-5 w-5 text-foreground" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              Self-Hostable
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              One command to deploy your entire stack. Your data stays on your
              infrastructure. No vendor lock-in.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["DOCKER COMPOSE", "ANY CLOUD"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
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
