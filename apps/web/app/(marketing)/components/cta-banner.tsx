import Link from "next/link";
import { ArrowRight, Code } from "lucide-react";

const GITHUB_REPO = "https://github.com/Work90210/APIFold";

export function CtaBanner() {
  return (
    <section className="relative border-t border-border px-6 py-28 md:py-36">

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          Ready to give your AI agents superpowers?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Stop writing custom MCP server code. Import your OpenAPI spec and let
          your AI agents call your APIs in 60 seconds.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center gap-2 rounded-md bg-foreground px-8 text-base font-semibold text-background transition-all duration-300 hover:bg-foreground/90 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Start for Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={GITHUB_REPO}
            className="inline-flex h-12 items-center gap-2 rounded-md border border-border bg-transparent px-8 text-base font-semibold text-foreground transition-all duration-300 hover:bg-muted/50 active:scale-[0.98]"
          >
            <Code className="h-4 w-4" />
            View Source Code
          </a>
        </div>

        <p className="mt-5 text-sm text-muted-foreground/60">
          No credit card required. Self-host in 60 seconds.
        </p>
      </div>
    </section>
  );
}
