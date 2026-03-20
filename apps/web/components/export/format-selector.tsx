"use client";

import { cn } from "@apifold/ui";

type ExportFormat = "json" | "yaml";

interface FormatSelectorProps {
  readonly selected: ExportFormat;
  readonly onChange: (format: ExportFormat) => void;
}

const formats: readonly { readonly value: ExportFormat; readonly label: string }[] = [
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
];

export function FormatSelector({ selected, onChange }: FormatSelectorProps) {
  return (
    <div className="flex rounded-xl border bg-muted/50 p-0.5">
      {formats.map((fmt) => (
        <button
          key={fmt.value}
          type="button"
          onClick={() => onChange(fmt.value)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300 ease-out-expo",
            selected === fmt.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {fmt.label}
        </button>
      ))}
    </div>
  );
}
