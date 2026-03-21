"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@apifold/ui";
import { BackLink } from "@/components/shared/back-link";
import { PageHeader } from "@/components/shared/page-header";
import { useImportSpec, useToast } from "@/lib/hooks";
import { useUIStore } from "@/lib/stores/ui-store";
import { StepIndicator } from "@/components/specs/step-indicator";
import { UrlInput } from "@/components/specs/url-input";
import { FileDropzone } from "@/components/specs/file-dropzone";
import { OperationPreview } from "@/components/specs/operation-preview";

const STEPS = [
  { label: "Source" },
  { label: "Preview" },
  { label: "Confirm" },
] as const;

interface ParsedSpec {
  readonly name: string;
  readonly version: string;
  readonly sourceUrl: string | null;
  readonly rawSpec: Record<string, unknown>;
  readonly operations: readonly {
    readonly method: string;
    readonly path: string;
    readonly summary?: string;
    readonly toolName: string;
  }[];
}

export default function ImportSpecPage() {
  const router = useRouter();
  const { wizardStep, setWizardStep, resetWizard } = useUIStore();
  const importSpec = useImportSpec();
  const { toast } = useToast();
  const [parsedSpec, setParsedSpec] = useState<ParsedSpec | null>(null);

  const handleUrlSubmit = async (url: string) => {
    try {
      const res = await fetch(url);
      const raw = await res.json();
      const info = extractSpecInfo(raw, url);
      setParsedSpec(info);
      setWizardStep(1);
    } catch {
      // Error handling done in UrlInput component
    }
  };

  const handleFileSelect = (content: string, _filename: string) => {
    try {
      const raw = JSON.parse(content);
      const info = extractSpecInfo(raw, null);
      setParsedSpec(info);
      setWizardStep(1);
    } catch {
      // Invalid JSON
    }
  };

  const handleConfirm = () => {
    if (!parsedSpec) return;
    importSpec.mutate(
      {
        name: parsedSpec.name,
        version: parsedSpec.version,
        sourceUrl: parsedSpec.sourceUrl,
        rawSpec: parsedSpec.rawSpec,
      },
      {
        onSuccess: (response) => {
          resetWizard();
          toast({
            title: "Spec imported",
            description: "Your API spec was imported successfully.",
            variant: "success",
          });
          const resp = response as unknown as Record<string, unknown>;
          const specId = resp.id ?? resp.specId;
          if (specId) {
            router.push(`/dashboard/specs/${specId}`);
          } else {
            router.push("/dashboard/specs");
          }
        },
        onError: (error: Error) => {
          toast({
            title: "Import failed",
            description: error.message || "Failed to import spec.",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="animate-in mx-auto max-w-3xl space-y-8">
      <BackLink href="/dashboard/specs" label="Back to Specs" />

      <PageHeader
        title="Import API Spec"
        description="Upload an OpenAPI or Swagger spec to generate MCP tools."
      />

      <StepIndicator steps={STEPS} currentStep={wizardStep} />

      {wizardStep === 0 && (
        <div className="space-y-6">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-fluid-lg font-heading tracking-tight">
                From URL
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UrlInput onSubmit={handleUrlSubmit} />
            </CardContent>
          </Card>
          <div className="relative flex items-center">
            <div className="border-t border-border/40 flex-grow" />
            <span className="mx-4 text-sm text-muted-foreground">or</span>
            <div className="border-t border-border/40 flex-grow" />
          </div>
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-fluid-lg font-heading tracking-tight">
                Upload File
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileDropzone onFileSelect={handleFileSelect} />
            </CardContent>
          </Card>
        </div>
      )}

      {wizardStep === 1 && parsedSpec && (
        <div className="space-y-6">
          <OperationPreview
            operations={parsedSpec.operations}
            specName={parsedSpec.name}
          />
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="rounded-lg"
              onClick={() => setWizardStep(0)}
            >
              Back
            </Button>
            <Button
              className="rounded-lg"
              onClick={() => setWizardStep(2)}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {wizardStep === 2 && parsedSpec && (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-fluid-lg font-heading tracking-tight">
              Confirm Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{parsedSpec.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Version</dt>
                <dd className="font-medium">{parsedSpec.version}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Operations</dt>
                <dd className="font-medium tabular-nums">
                  {parsedSpec.operations.length}
                </dd>
              </div>
            </dl>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="rounded-lg"
                onClick={() => setWizardStep(1)}
              >
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={importSpec.isPending}
                className="rounded-lg"
              >
                {importSpec.isPending ? "Importing..." : "Import Spec"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function extractSpecInfo(
  raw: Record<string, unknown>,
  sourceUrl: string | null,
): ParsedSpec {
  const info = (raw.info ?? {}) as Record<string, unknown>;
  const name = (info.title as string) ?? "Untitled API";
  const version = (info.version as string) ?? "1.0.0";
  const paths = (raw.paths ?? {}) as Record<
    string,
    Record<string, Record<string, unknown>>
  >;

  const operations = Object.entries(paths).flatMap(([path, methods]) =>
    Object.entries(methods)
      .filter(([method]) =>
        ["get", "post", "put", "patch", "delete"].includes(method),
      )
      .map(([method, detail]) => ({
        method: method.toUpperCase(),
        path,
        summary: detail.summary as string | undefined,
        toolName: (detail.operationId as string) ?? `${method}_${path.replace(/\//g, "_")}`,
      })),
  );

  return { name, version, sourceUrl, rawSpec: raw, operations };
}
