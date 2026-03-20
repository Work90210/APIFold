import Link from "next/link";
import { Zap, Github } from "lucide-react";

const GITHUB_REPO = "https://github.com/Work90210/APIFold";

const CHANGELOG = [
  {
    version: "v1.0.0",
    date: "March 20, 2026",
    tag: "Latest",
    tagColor: "text-emerald-400 bg-emerald-500/10 ring-emerald-500/20",
    changes: [
      { type: "feat", text: "Dashboard UI with full Impeccable design system" },
      { type: "feat", text: "Import wizard — URL or file upload with operation preview" },
      { type: "feat", text: "Server management — config, tools, console, logs, export" },
      { type: "feat", text: "Fumadocs documentation site with 7 MDX pages" },
      { type: "feat", text: "Dark mode toggle with system preference detection" },
      { type: "feat", text: "Cmd+K command palette for quick navigation" },
      { type: "feat", text: "Toast notifications on all actions" },
      { type: "feat", text: "Breadcrumb navigation" },
      { type: "feat", text: "Sparkline mini-charts on dashboard stats" },
      { type: "feat", text: "Real-time MCP runtime health indicator" },
      { type: "feat", text: "Content-shaped loading skeletons" },
      { type: "feat", text: "Error boundaries with retry" },
    ],
  },
  {
    version: "v0.4.0",
    date: "March 19, 2026",
    tag: null,
    tagColor: "",
    changes: [
      { type: "feat", text: "REST API layer — all CRUD endpoints with Clerk auth" },
      { type: "feat", text: "SSRF protection for spec URL fetching" },
      { type: "feat", text: "Redis pub/sub for real-time server hot-reload" },
      { type: "feat", text: "Rate limiting per user and per server" },
      { type: "docs", text: "Full API reference documentation (API.md)" },
    ],
  },
  {
    version: "v0.3.0",
    date: "March 17, 2026",
    tag: null,
    tagColor: "",
    changes: [
      { type: "feat", text: "MCP Runtime — SSE endpoints, tool execution, session management" },
      { type: "feat", text: "Circuit breaker per upstream API" },
      { type: "feat", text: "Tiered loading (L0/L1/L2) for memory efficiency" },
      { type: "feat", text: "AES-256-GCM credential vault with PBKDF2 key derivation" },
      { type: "perf", text: "Connection monitor with graceful degradation" },
    ],
  },
  {
    version: "v0.2.0",
    date: "March 14, 2026",
    tag: null,
    tagColor: "",
    changes: [
      { type: "feat", text: "Drizzle ORM schema — specs, servers, tools, credentials, logs" },
      { type: "feat", text: "Repository pattern for all data access" },
      { type: "feat", text: "Vault encryption/decryption with HSM-ready architecture" },
      { type: "feat", text: "Database migrations with zero-downtime support" },
    ],
  },
  {
    version: "v0.1.0",
    date: "March 10, 2026",
    tag: null,
    tagColor: "",
    changes: [
      { type: "feat", text: "@apifold/transformer — MIT-licensed OpenAPI to MCP converter" },
      { type: "feat", text: "Monorepo scaffolding with Turborepo + pnpm" },
      { type: "feat", text: "Shared TypeScript types package" },
      { type: "ci", text: "GitHub Actions CI/CD pipelines" },
    ],
  },
] as const;

const TYPE_COLORS: Record<string, string> = {
  feat: "text-[#a7a5ff] bg-[#a7a5ff]/10",
  fix: "text-[#53ddfc] bg-[#53ddfc]/10",
  perf: "text-emerald-400 bg-emerald-400/10",
  docs: "text-amber-400 bg-amber-400/10",
  ci: "text-[#ec63ff] bg-[#ec63ff]/10",
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#060e20] text-[#dee5ff] overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#40485d]/50 bg-[#060e20]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#645efb] to-[#a7a5ff]">
              <Zap className="h-4 w-4 text-white" />
            </div>
            APIFold
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link href="/#features" className="text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white">Features</Link>
            <Link href="/pricing" className="text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white">Pricing</Link>
            <Link href="/docs" className="text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white">Docs</Link>
            <Link href="/changelog" className="border-b-2 border-indigo-500 pb-1 text-sm font-medium text-white transition-colors duration-200">Changelog</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="hidden text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white sm:inline">Sign In</Link>
            <Link href="/dashboard" className="rounded-lg bg-gradient-to-r from-[#645efb] to-[#a7a5ff] px-5 py-2 text-sm font-medium text-white transition-all duration-200 hover:shadow-lg hover:shadow-[#a7a5ff]/20">Get Started Free</Link>
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {/* Hero */}
        <section className="px-6 pb-16 pt-24 text-center md:pt-32">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a7a5ff]">Changelog</p>
          <h1 className="mt-4 font-heading text-4xl font-extrabold tracking-tighter text-white sm:text-5xl">
            What&apos;s new in APIFold
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-[#a3aac4]">
            Follow our journey from transformer library to full-stack MCP platform.
          </p>
        </section>

        {/* Timeline */}
        <section className="mx-auto max-w-3xl px-6 pb-32">
          <div className="relative space-y-12">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-[#645efb] via-[#40485d] to-transparent" aria-hidden="true" />

            {CHANGELOG.map((release) => (
              <div key={release.version} className="relative pl-14">
                {/* Dot */}
                <div className="absolute left-3 top-1.5 h-3 w-3 rounded-full bg-[#645efb] ring-4 ring-[#060e20]" />

                {/* Header */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <h2 className="font-heading text-xl font-bold tracking-tight text-white">{release.version}</h2>
                  <span className="text-sm text-[#6d758c] tabular-nums">{release.date}</span>
                  {release.tag && (
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${release.tagColor}`}>
                      {release.tag}
                    </span>
                  )}
                </div>

                {/* Changes */}
                <ul className="space-y-2">
                  {release.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${TYPE_COLORS[change.type] ?? "text-[#a3aac4] bg-white/5"}`}>
                        {change.type}
                      </span>
                      <span className="text-[#a3aac4] leading-relaxed">{change.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 py-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <p className="text-sm text-[#6d758c]">&copy; 2026 APIFold. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm text-[#6d758c] hover:text-white transition-colors">Home</Link>
            <Link href="/docs" className="text-sm text-[#6d758c] hover:text-white transition-colors">Docs</Link>
            <a href={GITHUB_REPO} className="text-[#6d758c] hover:text-white transition-colors" aria-label="GitHub">
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
