import Link from "next/link";
import { Zap } from "lucide-react";

type ActivePage = "home" | "pricing" | "changelog" | "docs";

const NAV_LINKS = [
  { href: "/#features", label: "Features", page: "home" as const },
  { href: "/pricing", label: "Pricing", page: "pricing" as const },
  { href: "/docs", label: "Docs", page: "docs" as const },
  { href: "/changelog", label: "Changelog", page: "changelog" as const },
] as const;

export function LandingNav({ activePage }: { readonly activePage: ActivePage }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo left */}
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
            <Zap className="h-4 w-4 text-background" />
          </div>
          APIFold
        </Link>

        {/* Nav links center */}
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive = link.page === activePage;
            return (
              <Link
                key={link.page}
                href={link.href}
                className={
                  isActive
                    ? "border-b-2 border-foreground pb-1 text-sm font-medium text-foreground transition-colors duration-200"
                    : "text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Button right */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground sm:inline"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md bg-foreground px-5 py-2 text-sm font-medium text-background transition-all duration-200 hover:bg-foreground/90 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </nav>
  );
}
