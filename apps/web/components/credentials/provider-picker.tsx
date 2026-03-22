"use client";

import { Settings2, Globe } from "lucide-react";
import { cn } from "@apifold/ui";
import { getAllProviderPresets } from "@/lib/oauth/providers";
import type { OAuthProviderPreset } from "@/lib/oauth/types";

interface ProviderPickerProps {
  readonly selectedProviderId?: string;
  readonly onSelect: (provider: OAuthProviderPreset | "custom") => void;
}

export function ProviderPicker({ selectedProviderId, onSelect }: ProviderPickerProps) {
  const providers = getAllProviderPresets();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {providers.map((provider) => (
        <button
          key={provider.id}
          type="button"
          onClick={() => onSelect(provider)}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            selectedProviderId === provider.id
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "bg-card",
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Globe className="h-5 w-5 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium">{provider.name}</span>
        </button>
      ))}

      <button
        type="button"
        onClick={() => onSelect("custom")}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selectedProviderId === "custom"
            ? "border-primary bg-primary/5 ring-1 ring-primary"
            : "bg-card",
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Settings2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium">Custom</span>
      </button>
    </div>
  );
}
