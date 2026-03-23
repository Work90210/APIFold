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
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors duration-150 ease-out",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-accent/30",
        )}
        style={
          isDragging
            ? {
                borderImage:
                  "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--ring))) 1",
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
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-muted">
          <Upload className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium tracking-tight">
          Drop your spec file here
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground leading-normal">
          or{" "}
          <label className="cursor-pointer text-primary underline underline-offset-2 transition-colors duration-150 ease-out hover:text-primary/80">
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
