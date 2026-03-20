"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileJson,
  Server,
  Settings,
  Upload,
  BookOpen,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Dialog, DialogContent } from "@apifold/ui";

interface PaletteItem {
  readonly label: string;
  readonly href: string;
  readonly icon: LucideIcon;
}

const PALETTE_ITEMS: readonly PaletteItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Specs", href: "/dashboard/specs", icon: FileJson },
  { label: "Servers", href: "/dashboard/servers", icon: Server },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Import Spec", href: "/dashboard/specs/import", icon: Upload },
  { label: "Docs", href: "/docs", icon: BookOpen },
] as const;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return PALETTE_ITEMS;

    return PALETTE_ITEMS.filter((item) =>
      item.label.toLowerCase().includes(normalizedQuery),
    );
  }, [query]);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router],
  );

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setQuery("");
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-xl p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
        </div>
        <ul className="max-h-64 overflow-y-auto p-2" role="listbox">
          {filtered.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              No results found
            </li>
          )}
          {filtered.map((item) => (
            <li key={item.href} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => handleSelect(item.href)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

export function useCommandPalette() {
  return {
    open: () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true }),
      );
    },
  };
}
