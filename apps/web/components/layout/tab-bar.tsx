"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@apifold/ui";
import { NAV_ITEMS } from "@/lib/constants/navigation";

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="overflow-x-auto border-b border-border scrollbar-thin"
      aria-label="Dashboard navigation"
    >
      <div className="mx-auto flex max-w-[1200px] gap-0 whitespace-nowrap px-6">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative px-4 py-3 text-sm transition-colors duration-150",
                isActive
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.title}
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-[2px] bg-foreground" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
