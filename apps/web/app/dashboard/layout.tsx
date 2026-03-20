"use client";

import type { ReactNode } from "react";
import { Sheet, SheetContent } from "@apifold/ui";
import { useUIStore } from "@/lib/stores/ui-store";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CommandPalette } from "@/components/layout/command-palette";

export default function DashboardLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  const mobileSidebarOpen = useUIStore((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useUIStore((s) => s.setMobileSidebarOpen);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-2">
      <CommandPalette />
      <div className="hidden md:block shrink-0">
        <Sidebar />
      </div>
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0 md:hidden">
          <Sidebar />
        </SheetContent>
      </Sheet>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="mx-auto max-w-container">{children}</div>
        </main>
      </div>
    </div>
  );
}
