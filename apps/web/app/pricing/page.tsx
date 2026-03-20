import Link from "next/link";
import { Check, ArrowRight, Zap, Github, Terminal } from "lucide-react";

const GITHUB_REPO = "https://github.com/Work90210/APIFold";

const FREE_FEATURES = [
  "Unlimited API specs",
  "Unlimited MCP servers",
  "Full dashboard access",
  "SSE transport",
  "AES-256 credential vault",
  "Rate limiting",
  "Circuit breakers",
  "Real-time logs",
  "Community support",
  "MIT transformer library",
] as const;

const CLOUD_FEATURES = [
  "Everything in Self-Hosted",
  "Zero-config deployment",
  "Global edge network",
  "Automatic scaling",
  "Managed Postgres & Redis",
  "Custom domains",
  "Team collaboration",
  "Priority support",
  "99.9% uptime SLA",
  "SOC 2 compliance",
] as const;

const ENTERPRISE_FEATURES = [
  "Everything in Cloud",
  "Dedicated infrastructure",
  "SSO / SAML",
  "Audit logs",
  "Custom SLA",
  "On-premise deployment",
  "24/7 phone support",
  "Solutions engineering",
] as const;

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#060e20] text-[#dee5ff] overflow-x-hidden">
      <style>{`
        .glass-panel {
          background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
          border: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(20px);
        }
        .glass-panel:hover { border-color: rgba(255,255,255,0.12); }
      `}</style>

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
            <Link href="/pricing" className="border-b-2 border-indigo-500 pb-1 text-sm font-medium text-white transition-colors duration-200">Pricing</Link>
            <Link href="/docs" className="text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white">Docs</Link>
            <Link href="/changelog" className="text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white">Changelog</Link>
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
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a7a5ff]">Pricing</p>
          <h1 className="mt-4 font-heading text-4xl font-extrabold tracking-tighter text-white sm:text-5xl md:text-6xl">
            Free forever.<br />Seriously.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a3aac4]">
            APIFold is open source and self-hostable at no cost. We&apos;re building a managed cloud for teams who don&apos;t want to manage infrastructure.
          </p>
        </section>

        {/* Pricing Cards */}
        <section className="mx-auto max-w-6xl px-6 pb-32">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Self-Hosted — FREE */}
            <div className="glass-panel relative overflow-hidden rounded-2xl p-8">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/20">
                  <Terminal className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-heading text-xl font-bold tracking-tight text-white">Self-Hosted</h3>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/20">Available Now</span>
                </div>
              </div>
              <div className="mb-6">
                <span className="font-heading text-5xl font-extrabold text-white">$0</span>
                <span className="ml-2 text-[#a3aac4]">/ forever</span>
              </div>
              <p className="mb-8 text-sm leading-relaxed text-[#a3aac4]">
                Run the full stack on your own infrastructure. Docker Compose, one command, unlimited everything.
              </p>
              <Link
                href={GITHUB_REPO}
                className="mb-8 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98]"
              >
                <Github className="h-4 w-4" />
                Get Docker Compose
              </Link>
              <ul className="space-y-3">
                {FREE_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-[#a3aac4]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Cloud — Coming Soon */}
            <div className="glass-panel relative overflow-hidden rounded-2xl p-8">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#645efb] to-[#a7a5ff]" />
              <div className="absolute right-4 top-4">
                <span className="rounded-full bg-[#a7a5ff]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#a7a5ff] ring-1 ring-[#a7a5ff]/20">Recommended</span>
              </div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#645efb]/15 ring-1 ring-[#645efb]/20">
                  <Zap className="h-5 w-5 text-[#a7a5ff]" />
                </div>
                <div>
                  <h3 className="font-heading text-xl font-bold tracking-tight text-white">Cloud</h3>
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 ring-1 ring-amber-500/20">Coming Soon</span>
                </div>
              </div>
              <div className="mb-6">
                <span className="font-heading text-5xl font-extrabold text-white">$29</span>
                <span className="ml-2 text-[#a3aac4]">/ month</span>
              </div>
              <p className="mb-8 text-sm leading-relaxed text-[#a3aac4]">
                Zero-config managed hosting. We handle the infrastructure so you can focus on building.
              </p>
              <Link
                href="#"
                className="mb-8 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#645efb] to-[#a7a5ff] px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:shadow-[#a7a5ff]/20 active:scale-[0.98]"
              >
                Join the Waitlist
                <ArrowRight className="h-4 w-4" />
              </Link>
              <ul className="space-y-3">
                {CLOUD_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-[#a3aac4]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#a7a5ff]" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Enterprise */}
            <div className="glass-panel relative overflow-hidden rounded-2xl p-8">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#ec63ff] to-[#a7a5ff]" />
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ec63ff]/15 ring-1 ring-[#ec63ff]/20">
                  <Zap className="h-5 w-5 text-[#ec63ff]" />
                </div>
                <div>
                  <h3 className="font-heading text-xl font-bold tracking-tight text-white">Enterprise</h3>
                </div>
              </div>
              <div className="mb-6">
                <span className="font-heading text-5xl font-extrabold text-white">Custom</span>
              </div>
              <p className="mb-8 text-sm leading-relaxed text-[#a3aac4]">
                Dedicated infrastructure, SSO, audit logs, and a solutions team for mission-critical deployments.
              </p>
              <a
                href="mailto:hello@apifold.com"
                className="mb-8 flex w-full items-center justify-center gap-2 rounded-lg border border-[#40485d]/50 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-[#dee5ff] transition-all duration-200 hover:border-white/20 hover:bg-white/[0.08] active:scale-[0.98]"
              >
                Contact Sales
                <ArrowRight className="h-4 w-4" />
              </a>
              <ul className="space-y-3">
                {ENTERPRISE_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-[#a3aac4]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#ec63ff]" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* FAQ-style note */}
          <div className="mt-16 text-center">
            <p className="text-sm text-[#6d758c]">
              All plans include the full feature set. Self-hosted is free forever — no artificial limits.
              <br />
              The cloud plan is for teams who want managed infrastructure without the DevOps overhead.
            </p>
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
