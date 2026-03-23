"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/docs/changelog", label: "Changelog" },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full border-b border-border bg-background/95 backdrop-blur-sm">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                {label}
              </Link>
            ))}
            <div className="mt-2 border-t border-border pt-3">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="block rounded-md bg-foreground px-4 py-3 text-center text-sm font-medium text-background"
              >
                Get Started Free
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
