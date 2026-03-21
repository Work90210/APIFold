import Link from "next/link";
import {
  ArrowRight,
  Shield,
  LayoutDashboard,
  FileJson,
  Brain,
  Terminal,
  Download,
  Code,
  Users,
  Globe,
  Bot,
  Zap,
  Github,
} from "lucide-react";
import { GITHUB_REPO } from "@/lib/constants";
import { LandingNav } from "@/components/marketing/landing-nav";
import { LandingFooter } from "@/components/marketing/landing-footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#060e20] text-[#dee5ff] overflow-x-hidden">
      <style>{`
        .glass-panel { backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
        .mcp-glow { box-shadow: 0 0 40px -10px rgba(167, 165, 255, 0.3); }
        .kinetic-bg { background: radial-gradient(circle at 50% 50%, rgba(83, 221, 252, 0.05) 0%, transparent 50%); }
        .mesh-gradient { background-image: radial-gradient(at 0% 0%, rgba(100, 94, 251, 0.15) 0, transparent 50%), radial-gradient(at 100% 0%, rgba(236, 99, 255, 0.15) 0, transparent 50%); }
      `}</style>

      <LandingNav activePage="home" />

      {/* ===== HERO — TWO COLUMN ===== */}
      <section className="kinetic-bg relative px-6 pb-32 pt-28 md:pb-40 md:pt-32">
        {/* Spacer for fixed nav */}
        <div className="h-16" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-7xl">
          {/* Trust badge */}
          <div className="mb-12 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#40485d] bg-[#0f1930] px-4 py-1.5 text-xs font-medium tracking-wide text-[#a3aac4]">
              Open source — trusted by developers worldwide
            </span>
          </div>

          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left column — text */}
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#a7a5ff]">
                AGPL-3.0 + MIT transformer — 100% source available
              </p>
              <h1 className="font-heading text-4xl font-extrabold leading-[1.08] tracking-tighter text-white sm:text-5xl lg:text-6xl">
                Turn any REST API into a live{" "}
                <span className="bg-gradient-to-r from-[#a7a5ff] via-[#53ddfc] to-[#ec63ff] bg-clip-text text-transparent">
                  MCP server
                </span>{" "}
                in 60s.
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#a3aac4]">
                No code. No SDK wrappers. Just paste an OpenAPI spec and get a
                production-ready, open-source MCP bridge that any AI agent can
                connect to instantly.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/dashboard"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#645efb] to-[#a7a5ff] px-8 text-base font-semibold text-white shadow-lg shadow-[#645efb]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#645efb]/30 hover:-translate-y-0.5 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#638bff] focus-visible:outline-none"
                >
                  Start for Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href={GITHUB_REPO}
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#40485d] bg-[#0f1930] px-8 text-base font-semibold text-[#dee5ff] transition-all duration-300 hover:border-[#a7a5ff]/30 hover:bg-[#141f38] active:scale-[0.98]"
                >
                  <Github className="h-5 w-5" />
                  Browse GitHub
                </a>
              </div>
            </div>

            {/* Right column — orchestrator card */}
            <div className="relative">
              <div className="mcp-glow glass-panel rounded-2xl border border-[#40485d]/50 bg-[#0f1930]/80 p-6">
                {/* Card header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#645efb]/20 to-[#a7a5ff]/20 ring-1 ring-white/10">
                      <Zap className="h-4 w-4 text-[#a7a5ff]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        APIFold Runtime v1.0
                      </p>
                      <p className="text-xs text-[#a3aac4]">
                        Live orchestrator
                      </p>
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
                  <ArrowRight className="h-4 w-4 rotate-90 text-[#a7a5ff]/60" />
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
              </div>

              {/* Floating terminal snippet — positioned absolute bottom-right */}
              <div className="absolute -bottom-8 -right-4 z-20 hidden w-72 rounded-xl bg-[#000000] p-4 shadow-2xl ring-1 ring-[#40485d]/50 md:block sm:-right-8">
                <div className="mb-2 flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-[#ff5f57]" />
                  <div className="h-2 w-2 rounded-full bg-[#febc2e]" />
                  <div className="h-2 w-2 rounded-full bg-[#28c840]" />
                  <span className="ml-2 font-mono text-[9px] text-white/20">
                    terminal
                  </span>
                </div>
                <pre className="font-mono text-[11px] leading-relaxed text-[#a3aac4]">
                  <code>
                    <span className="text-emerald-400">$</span>{" "}
                    <span className="text-white">mcp connect</span> petstore
                    {"\n"}
                    <span className="text-[#53ddfc]">
                      {">"} Mapping 19 methods...
                    </span>
                    {"\n"}
                    <span className="text-emerald-400">
                      {">"} Protocol: SSE + JSON-RPC
                    </span>
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== BENTO FEATURES GRID ===== */}
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
              Enterprise-grade security, real-time observability, and
              multi-client support &mdash; all in a single self-hostable stack.
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
                    <span className="rounded-full bg-[#a7a5ff]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#a7a5ff] ring-1 ring-[#a7a5ff]/20">
                      AES-256
                    </span>
                    <span className="rounded-full bg-[#a7a5ff]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#a7a5ff] ring-1 ring-[#a7a5ff]/20">
                      ZERO-KNOWLEDGE
                    </span>
                    <span className="rounded-full bg-[#a7a5ff]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#a7a5ff] ring-1 ring-[#a7a5ff]/20">
                      SSRF PROTECTION
                    </span>
                  </div>
                </div>
                {/* Decorative image area — gradient placeholder */}
                <div className="hidden items-center justify-center md:flex">
                  <div className="h-48 w-full rounded-2xl bg-gradient-to-br from-[#645efb]/20 to-[#53ddfc]/20" role="img" aria-hidden="true" />
                </div>
              </div>
            </div>

            {/* Square dashboard card with mini chart */}
            <div className="glass-panel rounded-2xl border border-[#40485d]/30 bg-[#0f1930]/60 p-6 transition-all duration-300 hover:-translate-y-0.5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#645efb]/15 to-[#a7a5ff]/15 ring-1 ring-white/10">
                <LayoutDashboard className="h-5 w-5 text-[#a7a5ff]" />
              </div>
              <h3 className="font-heading text-lg font-semibold tracking-tight text-white">
                Visual Dashboard
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#a3aac4]">
                Import specs, manage tools, monitor connections, and configure
                auth — all from a single pane of glass.
              </p>
              {/* Mini chart placeholder */}
              <div className="mt-4 flex items-end gap-1 h-16" role="img" aria-hidden="true">
                <div className="w-3 rounded-t bg-[#a7a5ff]/20 h-[30%]" />
                <div className="w-3 rounded-t bg-[#a7a5ff]/30 h-[50%]" />
                <div className="w-3 rounded-t bg-[#a7a5ff]/20 h-[40%]" />
                <div className="w-3 rounded-t bg-[#a7a5ff]/40 h-[70%]" />
                <div className="w-3 rounded-t bg-[#a7a5ff]/30 h-[55%]" />
                <div className="w-3 rounded-t bg-[#a7a5ff]/50 h-[80%]" />
                <div className="w-3 rounded-t bg-[#a7a5ff]/40 h-[65%]" />
                <div className="w-3 rounded-t bg-[#a7a5ff]/60 h-[90%]" />
                <div className="w-3 rounded-t bg-[#a7a5ff] h-full" />
              </div>
            </div>

            {/* Three small cards in a row */}
            <div className="glass-panel rounded-2xl border border-[#40485d]/30 bg-[#0f1930]/60 p-6 transition-all duration-300 hover:-translate-y-0.5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#645efb]/15 to-[#a7a5ff]/15 ring-1 ring-white/10">
                <FileJson className="h-5 w-5 text-[#a7a5ff]" />
              </div>
              <h3 className="font-heading text-lg font-semibold tracking-tight text-white">
                Any OpenAPI Spec
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#a3aac4]">
                Drop in any spec and watch it transform. Every endpoint becomes
                a callable MCP tool with typed parameters.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#a7a5ff]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#a7a5ff] ring-1 ring-[#a7a5ff]/20">
                  OPENAPI 3.0
                </span>
                <span className="rounded-full bg-[#a7a5ff]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#a7a5ff] ring-1 ring-[#a7a5ff]/20">
                  OPENAPI 3.1
                </span>
                <span className="rounded-full bg-[#a7a5ff]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#a7a5ff] ring-1 ring-[#a7a5ff]/20">
                  SWAGGER 2.0
                </span>
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
                Claude Desktop, Cursor, Windsurf, Continue — if it speaks MCP,
                it works with APIFold. Standard SSE transport.
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
                <span className="rounded-full bg-[#a7a5ff]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#a7a5ff] ring-1 ring-[#a7a5ff]/20">
                  DOCKER COMPOSE
                </span>
                <span className="rounded-full bg-[#a7a5ff]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#a7a5ff] ring-1 ring-[#a7a5ff]/20">
                  ANY CLOUD
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS — 3 columns with connector line ===== */}
      <section className="relative border-t border-[#40485d]/50 px-6 py-28 md:py-36">
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a7a5ff]">
              How It Works
            </p>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Three steps. 60 seconds.
            </h2>
          </div>

          <div className="relative mt-16">
            {/* Connector line */}
            <div
              className="absolute left-0 right-0 top-10 hidden h-px bg-gradient-to-r from-transparent via-[#a7a5ff]/30 to-transparent md:block"
              aria-hidden="true"
            />

            <div className="grid gap-8 md:grid-cols-3">
              {/* Step 01 */}
              <div className="relative text-center">
                <div className="relative z-10 mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#40485d]/50 bg-[#0f1930] ring-1 ring-white/10">
                  <FileJson className="h-7 w-7 text-[#a7a5ff]" />
                </div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest tabular-nums text-[#a7a5ff]/60">
                  Step 01
                </p>
                <h3 className="font-heading text-xl font-bold tracking-tight text-white">
                  Import
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#a3aac4]">
                  Drop an OpenAPI spec URL or upload a JSON/YAML file.
                </p>
              </div>

              {/* Step 02 */}
              <div className="relative text-center">
                <div className="relative z-10 mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#40485d]/50 bg-[#0f1930] ring-1 ring-white/10">
                  <Zap className="h-7 w-7 text-[#a7a5ff]" />
                </div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest tabular-nums text-[#a7a5ff]/60">
                  Step 02
                </p>
                <h3 className="font-heading text-xl font-bold tracking-tight text-white">
                  Configure
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#a3aac4]">
                  Set auth mode, rate limits, and enable/disable tools.
                </p>
              </div>

              {/* Step 03 */}
              <div className="relative text-center">
                <div className="relative z-10 mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#40485d]/50 bg-[#0f1930] ring-1 ring-white/10">
                  <Bot className="h-7 w-7 text-[#a7a5ff]" />
                </div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest tabular-nums text-[#a7a5ff]/60">
                  Step 03
                </p>
                <h3 className="font-heading text-xl font-bold tracking-tight text-white">
                  Connect
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#a3aac4]">
                  Paste a 5-line JSON config into Claude Desktop or Cursor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOSTING — 2 columns ===== */}
      <section className="relative border-t border-[#40485d]/50 px-6 py-28 md:py-36">
        <div className="mesh-gradient pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a7a5ff]">
              Deployment
            </p>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Host It Your Way
            </h2>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2">
            {/* Hosted Cloud — LEFT with Recommended badge */}
            <div className="glass-panel rounded-2xl border border-[#40485d]/30 bg-[#0f1930]/60 p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#645efb]/15 to-[#a7a5ff]/15 ring-1 ring-white/10">
                  <Globe className="h-5 w-5 text-[#a7a5ff]" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-semibold tracking-tight text-white">
                    Hosted Cloud
                  </h3>
                  <span className="rounded-full bg-[#a7a5ff]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#a7a5ff] ring-1 ring-[#a7a5ff]/20">
                    Recommended
                  </span>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-[#a3aac4]">
                Zero-config managed hosting. Deploy MCP servers without
                managing infrastructure. Join the waitlist to get early access.
              </p>
              <div className="mt-6">
                <a
                  href="mailto:hello@apifold.com"
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#645efb] to-[#a7a5ff] px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:shadow-lg hover:shadow-[#a7a5ff]/20 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#638bff] focus-visible:outline-none"
                >
                  Join the Waitlist (Coming Soon)
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Self-Hosted — RIGHT with Docker stack grid */}
            <div className="glass-panel rounded-2xl border border-[#40485d]/30 bg-[#0f1930]/60 p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/15 ring-1 ring-emerald-500/20">
                  <Terminal className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-semibold tracking-tight text-white">
                    Self-Hosted
                  </h3>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/20">
                    Available Now
                  </span>
                </div>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-[#a3aac4]">
                Full-stack Docker Compose deployment. Your infrastructure, your
                data, your rules.
              </p>

              {/* Docker stack grid */}
              <div className="mb-6 grid grid-cols-3 gap-2">
                {(
                  [
                    "NGINX",
                    "NEXT.JS",
                    "EXPRESS",
                    "POSTGRES",
                    "REDIS",
                    "VAULT",
                  ] as const
                ).map((tech) => (
                  <div
                    key={tech}
                    className="rounded-lg bg-[#060e20]/60 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-[#a3aac4] ring-1 ring-[#40485d]/50"
                  >
                    {tech}
                  </div>
                ))}
              </div>

              <a
                href={GITHUB_REPO}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#638bff] focus-visible:outline-none"
              >
                <Download className="h-4 w-4" />
                Get Docker Compose
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== OPEN SOURCE — 2 columns ===== */}
      <section className="relative border-t border-[#40485d]/50 px-6 py-28 md:py-36">
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left — text + stats */}
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a7a5ff]">
                Open Source
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
                Built in the Open
              </h2>
              <p className="mt-4 max-w-lg leading-relaxed text-[#a3aac4]">
                Transparent, auditable, and community-driven. Every line of code
                is public.
              </p>

              {/* Stats row */}
              <div className="mt-8 grid grid-cols-3 gap-4">
                <div className="glass-panel rounded-xl border border-[#40485d]/30 bg-[#0f1930]/60 p-4 text-center">
                  <p className="font-heading text-2xl font-extrabold tabular-nums text-white">
                    80%+
                  </p>
                  <p className="mt-1 text-xs text-[#a3aac4]">Test Coverage</p>
                </div>
                <div className="glass-panel rounded-xl border border-[#40485d]/30 bg-[#0f1930]/60 p-4 text-center">
                  <p className="font-heading text-2xl font-extrabold text-white">
                    MIT + AGPL
                  </p>
                  <p className="mt-1 text-xs text-[#a3aac4]">License</p>
                </div>
                <div className="glass-panel rounded-xl border border-[#40485d]/30 bg-[#0f1930]/60 p-4 text-center">
                  <p className="font-heading text-2xl font-extrabold tabular-nums text-white">
                    100%
                  </p>
                  <p className="mt-1 text-xs text-[#a3aac4]">
                    Source Available
                  </p>
                </div>
              </div>

              {/* Links */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href={GITHUB_REPO}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#645efb] to-[#a7a5ff] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#645efb]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[#645efb]/30 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#638bff] focus-visible:outline-none"
                >
                  <Github className="h-4 w-4" />
                  Browse GitHub
                </a>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#40485d] bg-[#0f1930] px-6 py-3 text-sm font-semibold text-[#dee5ff] transition-all duration-300 hover:border-[#a7a5ff]/30 hover:bg-[#141f38] active:scale-[0.98]"
                >
                  <Users className="h-4 w-4" />
                  Join Discord
                </a>
              </div>
            </div>

            {/* Right — code snippet */}
            <div>
              <div className="mcp-glow rounded-2xl bg-[#000000] p-6 ring-1 ring-[#40485d]/50">
                <div className="mb-4 flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-3 font-mono text-[10px] text-white/20">
                    bridge.ts
                  </span>
                </div>
                <pre className="overflow-x-auto font-mono text-sm leading-relaxed">
                  <code>
                    <span className="text-[#c678dd]">async function</span>{" "}
                    <span className="text-[#61afef]">bridgeToMcp</span>
                    <span className="text-[#abb2bf]">(</span>
                    <span className="text-[#e06c75]">spec</span>
                    <span className="text-[#abb2bf]">: </span>
                    <span className="text-[#e5c07b]">ApiSpec</span>
                    <span className="text-[#abb2bf]">) {"{"}</span>
                    {"\n"}
                    {"  "}
                    <span className="text-[#c678dd]">const</span>{" "}
                    <span className="text-[#e06c75]">tools</span>{" "}
                    <span className="text-[#abb2bf]">=</span>{" "}
                    <span className="text-[#c678dd]">await</span>{" "}
                    <span className="text-[#61afef]">transform</span>
                    <span className="text-[#abb2bf]">(</span>
                    <span className="text-[#e06c75]">spec</span>
                    <span className="text-[#abb2bf]">);</span>
                    {"\n"}
                    {"  "}
                    <span className="text-[#c678dd]">const</span>{" "}
                    <span className="text-[#e06c75]">server</span>{" "}
                    <span className="text-[#abb2bf]">=</span>{" "}
                    <span className="text-[#61afef]">createMcpServer</span>
                    <span className="text-[#abb2bf]">({"{"}</span>
                    {"\n"}
                    {"    "}
                    <span className="text-[#e06c75]">tools</span>
                    <span className="text-[#abb2bf]">,</span>
                    {"\n"}
                    {"    "}
                    <span className="text-[#e06c75]">transport</span>
                    <span className="text-[#abb2bf]">: </span>
                    <span className="text-[#98c379]">&apos;sse&apos;</span>
                    <span className="text-[#abb2bf]">,</span>
                    {"\n"}
                    {"    "}
                    <span className="text-[#e06c75]">auth</span>
                    <span className="text-[#abb2bf]">: </span>
                    <span className="text-[#98c379]">&apos;bearer&apos;</span>
                    <span className="text-[#abb2bf]">,</span>
                    {"\n"}
                    {"  "}
                    <span className="text-[#abb2bf]">{"}"});</span>
                    {"\n"}
                    {"  "}
                    <span className="text-[#c678dd]">return</span>{" "}
                    <span className="text-[#e06c75]">server</span>
                    <span className="text-[#abb2bf]">.</span>
                    <span className="text-[#61afef]">listen</span>
                    <span className="text-[#abb2bf]">(</span>
                    <span className="text-[#d19a66]">3002</span>
                    <span className="text-[#abb2bf]">);</span>
                    {"\n"}
                    <span className="text-[#abb2bf]">{"}"}</span>
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA — Centered, full-width ===== */}
      <section className="relative border-t border-[#40485d]/50 px-6 py-28 md:py-36">
        <div className="mesh-gradient pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Ready to give your AI agents superpowers?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-[#a3aac4]">
            Stop writing custom MCP server code. Import your OpenAPI spec and
            let your AI agents call your APIs in 60 seconds.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#645efb] to-[#a7a5ff] px-8 text-base font-semibold text-white shadow-lg shadow-[#645efb]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#645efb]/30 hover:-translate-y-0.5 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#638bff] focus-visible:outline-none"
            >
              Start for Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={GITHUB_REPO}
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#40485d] bg-[#0f1930] px-8 text-base font-semibold text-[#dee5ff] transition-all duration-300 hover:border-[#a7a5ff]/30 hover:bg-[#141f38] active:scale-[0.98]"
            >
              <Code className="h-4 w-4" />
              View Source Code
            </a>
          </div>

          <p className="mt-5 text-sm text-[#6d758c]">
            No credit card required. Self-host in 60 seconds.
          </p>
        </div>
      </section>

      <LandingFooter variant="full" />
    </div>
  );
}
