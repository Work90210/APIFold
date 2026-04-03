import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { TrackedCtaLink } from "@/components/analytics/tracked-cta-link";
import { GithubStars } from "./github-stars";
import { TerminalDemo } from "./terminal-demo";

export function Hero() {
  return (
    <section className="relative px-6 pb-32 pt-28 md:pb-40 md:pt-32">
      <div className="h-16" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Trust badge */}
        <div className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-xs font-medium tracking-wide text-muted-foreground">
            Open source — trusted by developers worldwide
          </span>
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left column — text */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              AGPL-3.0 + MIT transformer — 100% source available
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tighter text-foreground sm:text-5xl lg:text-6xl">
              Your API. Any AI agent. In 30 seconds.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              MCP is the new standard for AI agents. Paste an OpenAPI spec and
              get a production-ready, open-source MCP bridge that any AI agent
              can connect to instantly.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <TrackedCtaLink
                href="/dashboard"
                cta="start_for_free"
                location="hero"
                className="inline-flex h-12 items-center gap-2 rounded-md bg-foreground px-8 text-base font-semibold text-background transition-all duration-300 hover:bg-foreground/90 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Start for Free
                <ArrowRight className="h-4 w-4" />
              </TrackedCtaLink>
              <Suspense
                fallback={
                  <div className="h-12 w-48 animate-pulse rounded-md border border-border bg-muted/50" />
                }
              >
                <GithubStars />
              </Suspense>
            </div>
          </div>

          {/* Right column — orchestrator card */}
          <div className="relative">
            <TerminalDemo />
          </div>
        </div>
      </div>
    </section>
  );
}
