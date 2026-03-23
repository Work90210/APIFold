"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ArrowLeft, Globe, Key, Shield, Lock, Zap, ExternalLink } from "lucide-react";
import { Input, Button, Badge } from "@apifold/ui";
import { cn } from "@apifold/ui";
import { useRegistry, type RegistryEntry, type Category } from "@/lib/hooks/use-registry";
import { useImportSpec } from "@/lib/hooks";

const CATEGORY_LABELS: Record<string, string> = {
  "payments": "Payments",
  "developer-tools": "Dev Tools",
  "communication": "Communication",
  "crm": "CRM",
  "ai": "AI",
  "productivity": "Productivity",
  "demo": "Demo",
};

const AUTH_ICONS: Record<string, typeof Key> = {
  bearer: Shield,
  api_key: Key,
  oauth: Globe,
  basic: Lock,
  none: Zap,
};

export default function BrowseRegistryPage() {
  const router = useRouter();
  const { entries, categories, query, setQuery, categoryFilter, setCategoryFilter } = useRegistry();
  const importSpec = useImportSpec();
  const [deploying, setDeploying] = useState<string | null>(null);

  const handleDeploy = async (entry: RegistryEntry) => {
    setDeploying(entry.id);
    try {
      // Fetch the spec from the registry and import it
      const specModule = await import(`@apifold/registry/specs/${entry.id}/spec.json`);
      const rawSpec = specModule.default ?? specModule;

      await importSpec.mutateAsync({
        name: entry.name,
        version: '1.0.0',
        rawSpec,
      });

      router.push('/dashboard/servers');
    } catch {
      setDeploying(null);
    }
  };

  return (
    <div className="animate-in space-y-8">
      <div>
        <Link
          href="/dashboard/specs/new"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to import
        </Link>
      </div>

      <div>
        <h1 className="text-fluid-3xl font-bold font-heading tracking-tight">
          API Registry
        </h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-prose">
          Deploy a pre-configured MCP server from our curated catalog. One click to go live.
        </p>
      </div>

      {/* Search + category filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search APIs..."
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              !categoryFilter ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat as Category)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                categoryFilter === cat ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      </div>

      {/* API Cards grid */}
      {entries.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No APIs match your search.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => {
            const AuthIcon = AUTH_ICONS[entry.authType] ?? Key;
            const isDeploying = deploying === entry.id;

            return (
              <div
                key={entry.id}
                className="group flex flex-col rounded-xl border border-border/60 bg-card p-5 transition-colors hover:border-border"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-lg font-bold">
                      {entry.name[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold leading-none">{entry.name}</h3>
                      <span className="text-xs text-muted-foreground">
                        {entry.operationCount} operations
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    <AuthIcon className="mr-1 h-3 w-3" />
                    {entry.authType}
                  </Badge>
                </div>

                <p className="mt-3 flex-1 text-sm text-muted-foreground leading-relaxed">
                  {entry.description}
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <a
                    href={entry.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Docs <ExternalLink className="h-3 w-3" />
                  </a>
                  <Button
                    size="sm"
                    disabled={isDeploying}
                    onClick={() => handleDeploy(entry)}
                  >
                    {isDeploying ? "Deploying..." : "Deploy"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
