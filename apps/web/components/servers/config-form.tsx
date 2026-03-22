"use client";

import { useState } from "react";
import Link from "next/link";
import type { McpServer, UpdateServerInput, AuthMode } from "@apifold/types";
import { Button, Input, Badge } from "@apifold/ui";
import { useUpdateServer, useToast } from "@/lib/hooks";
import { Save, Key, Shield, Globe, Lock, ShieldOff, ExternalLink } from "lucide-react";

interface ConfigFormProps {
  readonly server: McpServer;
}

const AUTH_MODE_OPTIONS: readonly {
  readonly value: AuthMode;
  readonly label: string;
  readonly description: string;
  readonly icon: typeof Key;
}[] = [
  { value: "none", label: "None", description: "No authentication", icon: ShieldOff },
  { value: "api_key", label: "API Key", description: "Static API key in header", icon: Key },
  { value: "bearer", label: "Bearer Token", description: "Bearer token in Authorization header", icon: Shield },
  { value: "oauth2_authcode", label: "OAuth 2.0 (User)", description: "Authorization code flow with PKCE", icon: Globe },
  { value: "oauth2_client_creds", label: "OAuth 2.0 (Service)", description: "Client credentials for machine-to-machine", icon: Lock },
];

export function ConfigForm({ server }: ConfigFormProps) {
  const updateServer = useUpdateServer();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: server.name,
    baseUrl: server.baseUrl,
    authMode: server.authMode,
    rateLimitPerMinute: server.rateLimitPerMinute,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: UpdateServerInput = {
      name: form.name,
      baseUrl: form.baseUrl,
      authMode: form.authMode,
      rateLimitPerMinute: form.rateLimitPerMinute,
    };
    updateServer.mutate(
      { id: server.id, input },
      {
        onSuccess: () => {
          toast({
            title: "Settings saved",
            description: "Server configuration updated successfully.",
            variant: "success",
          });
        },
        onError: (error: Error) => {
          toast({
            title: "Save failed",
            description: error.message || "Failed to update server configuration.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const isOAuth = form.authMode === "oauth2_authcode" || form.authMode === "oauth2_client_creds";

  return (
    <div className="rounded-xl bg-card shadow-sm p-6">
      <h2 className="text-fluid-xl font-semibold font-heading tracking-tight">
        Server Configuration
      </h2>
      <p className="mt-1 text-sm text-muted-foreground leading-normal max-w-prose">
        Configure how your MCP server connects to the upstream API.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <Input
          label="Server Name"
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
        />
        <Input
          label="Base URL"
          value={form.baseUrl}
          onChange={(e) =>
            setForm({ ...form, baseUrl: e.target.value })
          }
          helpText="The upstream API endpoint to proxy requests to."
        />

        <div className="space-y-3">
          <label className="text-sm font-medium">Auth Mode</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {AUTH_MODE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = form.authMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setForm({ ...form, authMode: option.value })}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                  }`}
                >
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                    isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-sm font-medium ${isSelected ? "text-primary" : ""}`}>
                      {option.label}
                    </div>
                    <div className="text-xs text-muted-foreground leading-tight mt-0.5">
                      {option.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {isOAuth && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm">
              <Globe className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-muted-foreground">
                Manage OAuth credentials in the{" "}
                <Link
                  href={`/dashboard/servers/${server.id}/credentials`}
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  Credentials tab
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </span>
            </div>
          )}
        </div>

        <Input
          label="Rate Limit (requests/min)"
          type="number"
          value={String(form.rateLimitPerMinute)}
          onChange={(e) =>
            setForm({
              ...form,
              rateLimitPerMinute: parseInt(e.target.value, 10) || 0,
            })
          }
        />
        <Button
          type="submit"
          disabled={updateServer.isPending}
          className="rounded-lg"
        >
          <Save className="mr-2 h-4 w-4" />
          {updateServer.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
