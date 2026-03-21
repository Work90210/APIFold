import Link from "next/link";
import { Zap, Github } from "lucide-react";
import { GITHUB_REPO } from "@/lib/constants";

interface LandingFooterProps {
  readonly variant: "full" | "compact";
}

function FullFooter() {
  return (
    <footer className="border-t border-[#40485d]/50 px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-6">
          {/* Brand -- spans 2 columns */}
          <div className="col-span-2">
            <Link
              href="/"
              className="flex items-center gap-2 font-heading text-lg font-bold text-white"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[#645efb] to-[#a7a5ff]">
                <Zap className="h-3.5 w-3.5 text-white" />
              </div>
              APIFold
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-[#a3aac4]">
              Open-source API-to-MCP bridge for the AI agent era.
            </p>
            <a
              href={GITHUB_REPO}
              className="mt-4 inline-flex text-[#a3aac4] transition-colors duration-200 hover:text-white"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>

          {/* Product */}
          <div>
            <p className="font-heading text-sm font-semibold text-white">Product</p>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/dashboard" className="text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white">
                  Dashboard
                </Link>
              </li>
              <li>
                <a href={GITHUB_REPO} className="text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white">
                  Self-Hosting
                </a>
              </li>
              <li>
                <Link href="/docs" className="text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white">
                  Documentation
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="font-heading text-sm font-semibold text-white">Resources</p>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/docs" className="text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/docs/api-reference" className="text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white">
                  API Reference
                </Link>
              </li>
              <li>
                <a href={GITHUB_REPO} className="text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white">
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          {/* Open Source */}
          <div>
            <p className="font-heading text-sm font-semibold text-white">Open Source</p>
            <ul className="mt-4 space-y-3">
              <li>
                <a href={GITHUB_REPO} className="text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white">
                  Repository
                </a>
              </li>
              <li>
                <a href={GITHUB_REPO} className="text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white">
                  Transformer (MIT)
                </a>
              </li>
              <li>
                <a href={`${GITHUB_REPO}/blob/main/LICENSE`} className="text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white">
                  AGPL License
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <p className="font-heading text-sm font-semibold text-white">Community</p>
            <ul className="mt-4 space-y-3">
              <li>
                <a href="#" className="text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white">
                  Discord
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white">
                  Twitter
                </a>
              </li>
              <li>
                <a href={GITHUB_REPO} className="text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white">
                  Contribute
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-[#40485d]/50 pt-8 sm:flex-row">
          <p className="text-sm text-[#6d758c]">&copy; 2026 APIFold</p>
          <a
            href={GITHUB_REPO}
            className="text-[#6d758c] transition-colors duration-200 hover:text-white"
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
  );
}

export function LandingFooter({ variant }: LandingFooterProps) {
  if (variant === "full") {
    return <FullFooter />;
  }
  return <CompactFooter />;
}
