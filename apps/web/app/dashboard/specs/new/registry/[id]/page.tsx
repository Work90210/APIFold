"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe, Key, Shield, Lock, Zap, ExternalLink, Rocket } from "lucide-react";
import { Button, Badge } from "@apifold/ui";
import { getById, type RegistryEntry } from "@apifold/registry";
import { useImportSpec } from "@/lib/hooks";

const AUTH_INFO: Record<string, { icon: typeof Key; label: string; hint: string }> = {
  bearer: { icon: Shield, label: "Bearer Token", hint: "You'll set this in the Credentials tab after deploying" },
  api_key: { icon: Key, label: "API Key", hint: "You'll set this in the Credentials tab after deploying" },
  oauth: { icon: Globe, label: "OAuth", hint: "Connect via the Credentials tab after deploying" },
  basic: { icon: Lock, label: "Basic Auth", hint: "You'll set this in the Credentials tab after deploying" },
  none: { icon: Zap, label: "No Auth", hint: "This API does not require authentication" },
};

export default function RegistryDeployPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const entry = getById(id);
  const importSpec = useImportSpec();
  const [deploying, setDeploying] = useState(false);

  if (!entry) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">API not found in registry.</p>
        <Link href="/dashboard/specs/new/registry" className="mt-2 text-sm text-primary hover:underline">
          Back to registry
        </Link>
      </div>
    );
  }

  const auth = AUTH_INFO[entry.authType] ?? AUTH_INFO['none']!;
  const AuthIcon = auth.icon;

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const specModule = await import(`@apifold/registry/specs/${entry.id}/spec.json`);
      const rawSpec = specModule.default ?? specModule;

      await importSpec.mutateAsync({
        name: entry.name,
        version: '1.0.0',
        rawSpec,
      });

      router.push('/dashboard/servers');
    } catch {
      setDeploying(false);
    }
  };

  return (
    <div className="animate-in max-w-2xl">
      <Link
        href="/dashboard/specs/new/registry"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to registry
      </Link>

      <div className="mt-8">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-2xl font-bold shrink-0">
            {entry.name[0]}
          </div>
          <div>
            <h1 className="text-fluid-2xl font-bold font-heading tracking-tight">{entry.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Badge variant="outline">{entry.category}</Badge>
          <Badge variant="outline">
            <AuthIcon className="mr-1 h-3 w-3" />
            {auth.label}
          </Badge>
          <Badge variant="outline">{entry.operationCount} operations</Badge>
        </div>

        {/* Auth info */}
        <div className="mt-8 rounded-lg border border-border/60 bg-card p-4">
          <div className="flex items-start gap-3">
            <AuthIcon className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <span className="text-sm font-medium">Authentication: {auth.label}</span>
              <p className="mt-0.5 text-xs text-muted-foreground">{auth.hint}</p>
            </div>
          </div>
        </div>

        {/* Docs link */}
        <a
          href={entry.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View API documentation <ExternalLink className="h-3.5 w-3.5" />
        </a>

        {/* Deploy */}
        <div className="mt-10 border-t border-border/40 pt-8">
          <Button
            size="lg"
            disabled={deploying}
            onClick={handleDeploy}
            className="w-full sm:w-auto"
          >
            <Rocket className="mr-2 h-4 w-4" />
            {deploying ? "Deploying..." : `Deploy ${entry.name} Server`}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Creates an MCP server with all {entry.operationCount} operations as tools.
          </p>
        </div>
      </div>
    </div>
  );
}
