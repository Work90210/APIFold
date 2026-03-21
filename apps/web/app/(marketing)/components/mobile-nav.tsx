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
        className="flex h-10 w-10 items-center justify-center rounded-lg text-[#a3aac4] transition-colors hover:text-white"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full border-b border-[#40485d]/50 bg-[#060e20]/95 backdrop-blur-xl">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-[#a3aac4] transition-colors hover:bg-[#0f1930] hover:text-white"
              >
                {label}
              </Link>
            ))}
            <div className="mt-2 border-t border-[#40485d]/50 pt-3">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="block rounded-lg bg-gradient-to-r from-[#645efb] to-[#a7a5ff] px-4 py-3 text-center text-sm font-medium text-white"
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
