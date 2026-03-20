"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

function capitalize(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface Crumb {
  readonly label: string;
  readonly href: string;
}

function buildCrumbs(pathname: string): readonly Crumb[] {
  const segments = pathname.split("/").filter(Boolean);

  // Skip if we're at /dashboard root
  if (segments.length <= 1) {
    return [];
  }

  return segments.map((segment, index) => ({
    label: capitalize(segment),
    href: "/" + segments.slice(0, index + 1).join("/"),
  }));
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  if (crumbs.length === 0) {
    return <div className="hidden md:flex flex-1" />;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden md:flex flex-1 items-center gap-1 text-sm text-muted-foreground"
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isLast ? (
              <span className="font-medium text-foreground">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
