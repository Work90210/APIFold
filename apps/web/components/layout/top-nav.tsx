"use client";

import Link from "next/link";
import { Menu, Search, X, Settings } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@apifold/ui";
import { useUIStore } from "@/lib/stores/ui-store";
import { ThemeToggle } from "./theme-toggle";
import { KeyboardShortcut } from "./keyboard-shortcut";
import { useCommandPalette } from "./command-palette";
import { MobileMenu } from "./mobile-menu";

export function TopNav() {
  const mobileMenuOpen = useUIStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen);
  const { open: openCommandPalette } = useCommandPalette();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
          <Link
            href="/dashboard"
            className="text-lg font-bold tracking-tight text-foreground"
          >
            APIFold
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCommandPalette}
            className="hidden items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors duration-150 hover:bg-muted sm:flex"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search...</span>
            <KeyboardShortcut keys="⌘K" />
          </button>
          <ThemeToggle />
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/settings" aria-label="Settings">
              <Settings className="h-5 w-5" />
            </Link>
          </Button>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      {mobileMenuOpen && <MobileMenu />}
    </header>
  );
}
