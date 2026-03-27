"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Plus, Check, Building2 } from "lucide-react";
import { Button } from "@apifold/ui";
import { cn } from "@apifold/ui";
import { useWorkspaces } from "@/lib/hooks";

interface WorkspaceSwitcherProps {
  readonly currentWorkspaceId?: string;
  readonly onSwitch?: (workspaceId: string) => void;
}

export function WorkspaceSwitcher({ currentWorkspaceId, onSwitch }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const { data: workspaces } = useWorkspaces();

  const current = workspaces?.find((w) => w.id === currentWorkspaceId) ?? workspaces?.[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm transition-colors duration-150 hover:bg-muted/50"
      >
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="max-w-[120px] truncate font-medium">
          {current?.name ?? "Personal"}
        </span>
        <ChevronDown className={cn(
          "h-3.5 w-3.5 text-muted-foreground transition-transform duration-150",
          open && "rotate-180",
        )} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-background p-1 shadow-lg">
            {workspaces?.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                onClick={() => {
                  onSwitch?.(workspace.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors duration-150",
                  workspace.id === current?.id
                    ? "bg-muted font-medium"
                    : "hover:bg-muted/50",
                )}
              >
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate text-left">{workspace.name}</span>
                {workspace.id === current?.id && (
                  <Check className="h-3.5 w-3.5 shrink-0" />
                )}
              </button>
            ))}

            <div className="my-1 border-t border-border" />

            <Link
              href="/dashboard/settings/workspaces/new"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted/50 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>Create workspace</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
