"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileJson,
  Server,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn, Button } from "@apifold/ui";
import { useUIStore } from "@/lib/stores/ui-store";
import { KeyboardShortcut } from "@/components/layout/keyboard-shortcut";
import { useCommandPalette } from "@/components/layout/command-palette";

const navItems = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { title: "Specs", href: "/dashboard/specs", icon: FileJson, exact: false },
  { title: "Servers", href: "/dashboard/servers", icon: Server, exact: false },
  { title: "Settings", href: "/dashboard/settings", icon: Settings, exact: false },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const desktopSidebarOpen = useUIStore((s) => s.desktopSidebarOpen);
  const toggleDesktopSidebar = useUIStore((s) => s.toggleDesktopSidebar);
  const { open: openCommandPalette } = useCommandPalette();

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border/50 bg-surface-1 transition-all duration-300 ease-out-expo",
        desktopSidebarOpen ? "w-64" : "w-16",
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-border/50 px-4">
        {desktopSidebarOpen && (
          <span className="text-lg font-extrabold font-heading tracking-tighter text-foreground animate-brand">
            APIFold
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDesktopSidebar}
          aria-label={
            desktopSidebarOpen ? "Collapse sidebar" : "Expand sidebar"
          }
        >
          {desktopSidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
      <nav role="navigation" aria-label="Main" className="flex flex-col gap-1 p-3">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out-expo",
                isActive
                  ? "bg-foreground/5 text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                !desktopSidebarOpen && "justify-center px-0",
              )}
              title={!desktopSidebarOpen ? item.title : undefined}
            >
              {/* Active left border indicator */}
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r-full bg-foreground" />
              )}
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors duration-150",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              {desktopSidebarOpen && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-border/50 p-3">
        <button
          type="button"
          onClick={openCommandPalette}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            !desktopSidebarOpen && "justify-center px-0",
          )}
        >
          {desktopSidebarOpen ? (
            <>
              <span>Search</span>
              <KeyboardShortcut keys="⌘K" />
            </>
          ) : (
            <KeyboardShortcut keys="⌘K" />
          )}
        </button>
      </div>
    </aside>
  );
}
