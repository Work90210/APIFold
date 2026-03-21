"use client";

import { useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
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
    <div className="animate-in space-y-8">
      {/* Back link */}
      <Link
        href={`/dashboard/servers/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Server
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-fluid-3xl font-bold font-heading tracking-tight">
          Export
        </h1>
        <p className="mt-1 text-sm text-muted-foreground leading-normal max-w-prose">
          Export your server configuration as JSON or YAML.
        </p>
      </div>

      <div className="border-t border-border/40" />

      {/* Format selector */}
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-xl bg-card shadow-sm p-6">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
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
          <Skeleton className="h-96 rounded-xl" />
        ) : data ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl bg-card shadow-sm">
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
