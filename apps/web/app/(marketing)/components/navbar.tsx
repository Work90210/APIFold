import Link from "next/link";
import { Zap } from "lucide-react";
import { MobileNav } from "./mobile-nav";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
            <Zap className="h-4 w-4 text-background" />
          </div>
          APIFold
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="/#features"
            className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            Pricing
          </Link>
          <Link
            href="/docs"
            className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            Docs
          </Link>
          <Link
            href="/docs/changelog"
            className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            Changelog
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground sm:inline"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="hidden rounded-md bg-foreground px-5 py-2 text-sm font-medium text-background transition-all duration-200 hover:bg-foreground/90 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:inline-flex"
          >
            Get Started Free
          </Link>
          <MobileNav />
        </div>
      </div>
    </nav>
  );
}
