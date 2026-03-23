import { LandingNav } from "@/components/marketing/landing-nav";
import { LandingFooter } from "@/components/marketing/landing-footer";

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
  feat: "text-primary bg-primary/10",
  fix: "text-status-info bg-status-info/10",
  perf: "text-status-success bg-status-success/10",
  docs: "text-status-warning bg-status-warning/10",
  ci: "text-muted-foreground bg-muted",
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <LandingNav activePage="changelog" />

      <main className="pt-20">
        {/* Hero */}
        <section className="px-6 pb-16 pt-24 text-center md:pt-32">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Changelog</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tighter sm:text-5xl">
            What&apos;s new in APIFold
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Follow our journey from transformer library to full-stack MCP platform.
          </p>
        </section>

        {/* Timeline */}
        <section className="mx-auto max-w-3xl px-6 pb-32">
          <div className="relative space-y-12">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" aria-hidden="true" />

            {CHANGELOG.map((release) => (
              <div key={release.version} className="relative pl-14">
                {/* Dot */}
                <div className="absolute left-3 top-1.5 h-3 w-3 rounded-full bg-foreground ring-4 ring-background" />

                {/* Header */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <h2 className="text-xl font-semibold tracking-tight">{release.version}</h2>
                  <span className="text-sm text-muted-foreground/60 tabular-nums">{release.date}</span>
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
                      <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${TYPE_COLORS[change.type] ?? "text-muted-foreground bg-muted"}`}>
                        {change.type}
                      </span>
                      <span className="text-muted-foreground leading-relaxed">{change.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>

      <LandingFooter variant="compact" />
    </div>
  );
}
