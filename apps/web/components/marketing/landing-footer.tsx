import Link from "next/link";
import { Zap, Github } from "lucide-react";
import { GITHUB_REPO } from "@/lib/constants";

interface LandingFooterProps {
  readonly variant: "full" | "compact";
}

function FullFooter() {
  return (
    <footer className="border-t border-border px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-6">
          {/* Brand -- spans 2 columns */}
          <div className="col-span-2">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold text-foreground"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground">
                <Zap className="h-3.5 w-3.5 text-background" />
              </div>
              APIFold
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Open-source API-to-MCP bridge for the AI agent era.
            </p>
            <a
              href={GITHUB_REPO}
              className="mt-4 inline-flex text-muted-foreground transition-colors duration-200 hover:text-foreground"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>

          {/* Product */}
          <div>
            <p className="text-sm font-semibold text-foreground">Product</p>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/dashboard" className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground">
                  Dashboard
                </Link>
              </li>
              <li>
                <a href={GITHUB_REPO} className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground">
                  Self-Hosting
                </a>
              </li>
              <li>
                <Link href="/docs" className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground">
                  Documentation
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="text-sm font-semibold text-foreground">Resources</p>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/docs" className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/docs/api-reference" className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground">
                  API Reference
                </Link>
              </li>
              <li>
                <a href={GITHUB_REPO} className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground">
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          {/* Open Source */}
          <div>
            <p className="text-sm font-semibold text-foreground">Open Source</p>
            <ul className="mt-4 space-y-3">
              <li>
                <a href={GITHUB_REPO} className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground">
                  Repository
                </a>
              </li>
              <li>
                <a href={GITHUB_REPO} className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground">
                  Transformer (MIT)
                </a>
              </li>
              <li>
                <a href={`${GITHUB_REPO}/blob/main/LICENSE`} className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground">
                  AGPL License
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <p className="text-sm font-semibold text-foreground">Community</p>
            <ul className="mt-4 space-y-3">
              <li>
                <a href="#" className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground">
                  Discord
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground">
                  Twitter
                </a>
              </li>
              <li>
                <a href={GITHUB_REPO} className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground">
                  Contribute
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground/60">&copy; 2026 APIFold</p>
          <a
            href={GITHUB_REPO}
            className="text-muted-foreground/60 transition-colors duration-200 hover:text-foreground"
            aria-label="GitHub"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}

function CompactFooter() {
  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <p className="text-sm text-muted-foreground/60">&copy; 2026 APIFold. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm text-muted-foreground/60 hover:text-foreground transition-colors">Home</Link>
          <Link href="/docs" className="text-sm text-muted-foreground/60 hover:text-foreground transition-colors">Docs</Link>
          <a href={GITHUB_REPO} className="text-muted-foreground/60 hover:text-foreground transition-colors" aria-label="GitHub">
            <Github className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}

export function LandingFooter({ variant }: LandingFooterProps) {
  if (variant === "full") {
    return <FullFooter />;
  }
  return <CompactFooter />;
}
