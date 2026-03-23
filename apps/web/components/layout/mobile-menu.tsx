"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@apifold/ui";
import { useUIStore } from "@/lib/stores/ui-store";
import { NAV_ITEMS } from "@/lib/constants/navigation";

export function MobileMenu() {
  const pathname = usePathname();
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen);

  return (
    <nav className="absolute left-0 right-0 top-full z-30 border-b border-border bg-background px-4 py-3 md:hidden">
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm transition-colors duration-150",
                  isActive
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
