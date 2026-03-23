"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@apifold/ui";

interface SubTabItem {
  readonly title: string;
  readonly href: string;
  readonly exact?: boolean;
}

interface SubTabBarProps {
  readonly items: readonly SubTabItem[];
}

export function SubTabBar({ items }: SubTabBarProps) {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border" aria-label="Section navigation">
      <div className="flex gap-0">
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative px-3 py-2.5 text-[13px] transition-colors duration-150",
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
