"use client";

import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@apifold/ui";

interface FileDropzoneProps {
  readonly onFileSelect: (content: string, filename: string) => void;
}

export function FileDropzone({ onFileSelect }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>();

  const handleFile = useCallback(
    async (file: File) => {
      setError(undefined);

      const validTypes = [
        "application/json",
        "application/x-yaml",
        "text/yaml",
        "text/plain",
      ];
      const validExtensions = [".json", ".yaml", ".yml"];
      const hasValidExtension = validExtensions.some((ext) =>
        file.name.toLowerCase().endsWith(ext),
      );

      if (!validTypes.includes(file.type) && !hasValidExtension) {
        setError("Please upload a JSON or YAML file.");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError("File must be smaller than 10 MB.");
        return;
      }

      const text = await file.text();
      onFileSelect(text, file.name);
    },
    [onFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300 ease-out-expo",
          isDragging
            ? "border-brand-500 bg-brand-500/5 shadow-inner"
            : "border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-accent/30",
        )}
        style={
          isDragging
            ? {
                borderImage:
                  "linear-gradient(135deg, hsl(var(--brand-500)), hsl(var(--brand-400))) 1",
              }
            : undefined
        }
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10">
          <Upload className="h-6 w-6 text-brand-500" />
        </div>
        <p className="text-sm font-medium font-heading tracking-tight">
          Drop your spec file here
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground leading-normal">
          or{" "}
          <label className="cursor-pointer text-primary underline underline-offset-2 transition-colors duration-200 ease-out-expo hover:text-brand-600">
            browse files
            <input
              type="file"
              accept=".json,.yaml,.yml"
              onChange={handleChange}
              className="sr-only"
            />
          </label>
        </p>
        <p className="mt-3 text-xs text-muted-foreground/70 leading-normal">
          Supports OpenAPI 3.0/3.1, Swagger 2.0 (JSON or YAML, max 10 MB)
        </p>
      </div>
      {error && (
        <p className="text-sm text-destructive leading-normal">{error}</p>
      )}
    </div>
  );
}
