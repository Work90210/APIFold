import Link from "next/link";
import { Github } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const GITHUB_REPO = "https://github.com/Work90210/APIFold";

const FOOTER_LINKS = {
  Product: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Self-Hosting", href: GITHUB_REPO, external: true },
    { label: "Documentation", href: "/docs" },
    { label: "Pricing", href: "/pricing" },
  ],
  Resources: [
    { label: "Getting Started", href: "/docs/getting-started" },
    { label: "API Reference", href: "/docs/api-reference" },
    { label: "FAQ", href: "/docs/faq" },
    { label: "Changelog", href: "/docs/changelog" },
  ],
  "Open Source": [
    { label: "Repository", href: GITHUB_REPO, external: true },
    { label: "Transformer (MIT)", href: GITHUB_REPO, external: true },
    {
      label: "AGPL License",
      href: `${GITHUB_REPO}/blob/main/LICENSE`,
      external: true,
    },
  ],
  Community: [
    { label: "Discussions", href: `${GITHUB_REPO}/discussions`, external: true },
    { label: "Issues", href: `${GITHUB_REPO}/issues`, external: true },
    { label: "Contribute", href: GITHUB_REPO, external: true },
  ],
} as const;

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-6">
          {/* Brand — spans 2 columns */}
          <div className="col-span-2">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold text-foreground"
            >
              <Logo className="h-6 w-6 text-foreground" />
              APIFold
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Open-source API-to-MCP bridge for the AI agent era.
            </p>
            <p className="mt-2 text-xs text-muted-foreground/60">
              No telemetry by default.
            </p>
            <a
              href={GITHUB_REPO}
              className="mt-4 inline-flex text-muted-foreground transition-colors duration-200 hover:text-foreground"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <p className="text-sm font-semibold text-foreground">
                {heading}
              </p>
              <ul className="mt-4 space-y-3">
                {links.map(({ label, href, ...rest }) => (
                  <li key={label}>
                    {"external" in rest ? (
                      <a
                        href={href}
                        className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {label}
                      </a>
                    ) : (
                      <Link
                        href={href}
                        className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                      >
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
