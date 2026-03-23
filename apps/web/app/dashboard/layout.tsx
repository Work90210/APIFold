"use client";

import type { ReactNode } from "react";
import { TopNav } from "@/components/layout/top-nav";
import { CommandPalette } from "@/components/layout/command-palette";

export default function DashboardLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <CommandPalette />
      <TopNav />
      <main className="mx-auto max-w-[1200px] px-6 py-8">
        {children}
      </main>
    </div>
  );
}
