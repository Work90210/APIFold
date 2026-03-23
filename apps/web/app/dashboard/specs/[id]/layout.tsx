"use client";

import type { ReactNode } from "react";
import { use } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useSpec } from "@/lib/hooks";

export default function SpecDetailLayout({
  children,
  params,
}: {
  readonly children: ReactNode;
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = use(params);
  const { data: spec } = useSpec(id);

  return (
    <div className="-mt-4">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Overview
        </Link>
        {spec && (
          <>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-medium">{spec.name}</span>
          </>
        )}
      </div>
      {children}
    </div>
  );
}
