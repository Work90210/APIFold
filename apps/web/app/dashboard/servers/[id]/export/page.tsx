"use client";

import { useState, use } from "react";
import { Download } from "lucide-react";
import { Button, CodeBlock, Skeleton } from "@apifold/ui";
import { useExport } from "@/lib/hooks";
import { FormatSelector } from "@/components/export/format-selector";

type ExportFormat = "json" | "yaml";

export default function ExportPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = use(params);
  const [format, setFormat] = useState<ExportFormat>("json");
  const { data, isLoading, refetch } = useExport(id, format);

  const handleExport = () => {
    refetch();
  };

  const handleDownload = () => {
    if (!data) return;
    const blob = new Blob([data.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = data.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-lg font-semibold tracking-tight">Export</h1>

      {/* Format selector */}
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            Output Format
          </h3>
          <div className="flex items-center gap-4">
            <FormatSelector selected={format} onChange={setFormat} />
            <Button
              className="rounded-lg"
              onClick={handleExport}
              disabled={isLoading}
            >
              {isLoading ? "Generating..." : "Generate Export"}
            </Button>
          </div>
        </div>

        {/* Code preview */}
        {isLoading ? (
          <Skeleton className="h-96 rounded-lg" />
        ) : data ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-border">
              <CodeBlock
                code={data.content}
                language={format}
                title={data.filename}
              />
            </div>
            <div className="flex justify-end">
              <Button
                className="rounded-lg"
                onClick={handleDownload}
              >
                <Download className="mr-2 h-4 w-4" />
                Download {data.filename}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
