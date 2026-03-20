"use client";

import { useState } from "react";
import type { McpServer, UpdateServerInput } from "@apifold/types";
import { Button, Input } from "@apifold/ui";
import { useUpdateServer, useToast } from "@/lib/hooks";
import { Save } from "lucide-react";

interface ConfigFormProps {
  readonly server: McpServer;
}

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
        <div className="space-y-2">
          <label className="text-sm font-medium">Auth Mode</label>
          <select
            value={form.authMode}
            onChange={(e) =>
              setForm({
                ...form,
                authMode: e.target.value as McpServer["authMode"],
              })
            }
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="none">None</option>
            <option value="api_key">API Key</option>
            <option value="bearer">Bearer Token</option>
          </select>
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
