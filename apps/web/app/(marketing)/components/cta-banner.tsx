import Link from "next/link";
import { ArrowRight, Code } from "lucide-react";

const GITHUB_REPO = "https://github.com/Work90210/APIFold";

export function CtaBanner() {
  return (
    <section className="relative border-t border-[#40485d]/50 px-6 py-28 md:py-36">
      <div className="pointer-events-none absolute inset-0 bg-[image:radial-gradient(at_0%_0%,rgba(100,94,251,0.15)_0,transparent_50%),radial-gradient(at_100%_0%,rgba(236,99,255,0.15)_0,transparent_50%)]" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
          Ready to give your AI agents superpowers?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-[#a3aac4]">
          Stop writing custom MCP server code. Import your OpenAPI spec and let
          your AI agents call your APIs in 60 seconds.
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
  );
}
