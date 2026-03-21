import Link from "next/link";
import { Zap } from "lucide-react";
import { MobileNav } from "./mobile-nav";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#40485d]/50 bg-[#060e20]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight text-white"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#645efb] to-[#a7a5ff]">
            <Zap className="h-4 w-4 text-white" />
          </div>
          APIFold
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="/#features"
            className="text-sm font-medium text-[#a3aac4] transition-colors duration-200 hover:text-white"
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white"
          >
            Pricing
          </Link>
          <Link
            href="/docs"
            className="text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white"
          >
            Docs
          </Link>
          <Link
            href="/docs/changelog"
            className="text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white"
          >
            Changelog
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden text-sm text-[#a3aac4] transition-colors duration-200 hover:text-white sm:inline"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="hidden rounded-lg bg-gradient-to-r from-[#645efb] to-[#a7a5ff] px-5 py-2 text-sm font-medium text-white transition-all duration-200 hover:shadow-lg hover:shadow-[#a7a5ff]/20 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#638bff] focus-visible:outline-none md:inline-flex"
          >
            Get Started Free
          </Link>
          <MobileNav />
        </div>
      </div>
    </nav>
  );
}
