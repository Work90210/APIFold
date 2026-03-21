import Link from "next/link";
import { Github, Zap } from "lucide-react";

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
    <footer className="border-t border-[#40485d]/50 px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-6">
          {/* Brand — spans 2 columns */}
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
            <p className="mt-2 text-xs text-[#6d758c]">
              No telemetry by default.
            </p>
            <a
              href={GITHUB_REPO}
              className="mt-4 inline-flex text-[#a3aac4] transition-colors duration-200 hover:text-white"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <p className="font-heading text-sm font-semibold text-white">
                {heading}
              </p>
              <ul className="mt-4 space-y-3">
                {links.map(({ label, href, ...rest }) => (
                  <li key={label}>
                    {"external" in rest ? (
                      <a
                        href={href}
                        className="text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {label}
                      </a>
                    ) : (
                      <Link
                        href={href}
                        className="text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white"
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
