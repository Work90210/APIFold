import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { GithubStars } from "./github-stars";
import { TerminalDemo } from "./terminal-demo";

export function Hero() {
  return (
    <section className="kinetic-bg relative px-6 pb-32 pt-28 md:pb-40 md:pt-32">
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
              Your API. Any AI agent.{" "}
              <span className="bg-gradient-to-r from-[#a7a5ff] via-[#53ddfc] to-[#ec63ff] bg-clip-text text-transparent">
                In 30 seconds.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#a3aac4]">
              MCP is the new standard for AI agents. Paste an OpenAPI spec and
              get a production-ready, open-source MCP bridge that any AI agent
              can connect to instantly.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#645efb] to-[#a7a5ff] px-8 text-base font-semibold text-white shadow-lg shadow-[#645efb]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#645efb]/30 hover:-translate-y-0.5 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#638bff] focus-visible:outline-none"
              >
                Start for Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Suspense
                fallback={
                  <div className="h-12 w-48 animate-pulse rounded-xl border border-[#40485d] bg-[#0f1930]" />
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
