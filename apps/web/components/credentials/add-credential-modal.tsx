"use client";

import { useState } from "react";
import { Loader2, Key, Shield, Globe, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
  Input,
} from "@apifold/ui";
import type { OAuthProviderPreset } from "@/lib/oauth/types";
import {
  useCreateCredential,
  useOAuthAuthorize,
  useOAuthClientCredentials,
} from "@/lib/hooks/use-credentials";
import { ProviderPicker } from "./provider-picker";

type AuthType = "api_key" | "bearer" | "oauth2_authcode" | "oauth2_client_creds";

interface AddCredentialModalProps {
  readonly serverId: string;
}

const AUTH_TYPES = [
  { id: "api_key" as const, label: "API Key", icon: Key },
  { id: "bearer" as const, label: "Bearer Token", icon: Shield },
  { id: "oauth2_authcode" as const, label: "OAuth (User)", icon: Globe },
  { id: "oauth2_client_creds" as const, label: "OAuth (Service)", icon: Lock },
];

export function AddCredentialModal({ serverId }: AddCredentialModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [authType, setAuthType] = useState<AuthType>("api_key");
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [scopes, setScopes] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<
    OAuthProviderPreset | "custom" | null
  >(null);

  const [error, setError] = useState<string | null>(null);
  const createCredential = useCreateCredential();
  const authorize = useOAuthAuthorize();
  const clientCreds = useOAuthClientCredentials();

  const isLoading =
    createCredential.isPending || authorize.isPending || clientCreds.isPending;

  const handleReset = () => {
    setAuthType("api_key");
    setLabel("");
    setKey("");
    setClientId("");
    setClientSecret("");
    setScopes("");
    setSelectedProvider(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    if (!label) {
      setError("Label is required");
      return;
    }

    try {
      if (authType === "api_key" || authType === "bearer") {
        if (!key) throw new Error("Key is required");
        await createCredential.mutateAsync({
          serverId,
          input: { serverId, label, authType, plaintextKey: key },
        });
        // Success — close modal
        setIsOpen(false);
        handleReset();
      } else if (authType === "oauth2_authcode") {
        if (!selectedProvider || selectedProvider === "custom") {
          throw new Error("Select a provider for OAuth Authorization Code");
        }
        if (!clientId || !clientSecret) {
          throw new Error("Client ID and Secret are required");
        }

        const scopeList = scopes
          .split(/[, ]+/)
          .filter(Boolean);
        const finalScopes =
          scopeList.length > 0
            ? scopeList
            : [...selectedProvider.defaultScopes];

        const result = await authorize.mutateAsync({
          serverId,
          provider: selectedProvider.id,
          clientId,
          clientSecret,
          scopes: finalScopes,
        });

        // Redirect to OAuth provider
        window.location.href = result.authorizationUrl;
      } else if (authType === "oauth2_client_creds") {
        if (!selectedProvider) throw new Error("Select a provider");
        if (!clientId || !clientSecret) {
          throw new Error("Client ID and Secret are required");
        }

        const providerId =
          selectedProvider === "custom" ? "custom" : selectedProvider.id;
        const scopeList = scopes.split(/[, ]+/).filter(Boolean);

        await clientCreds.mutateAsync({
          serverId,
          provider: providerId,
          clientId,
          clientSecret,
          label,
          scopes: scopeList.length > 0 ? scopeList : undefined,
        });

        // Success — close modal
        setIsOpen(false);
        handleReset();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create credential",
      );
    }
  };

  const onProviderSelect = (p: OAuthProviderPreset | "custom") => {
    setSelectedProvider(p);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(val) => {
        setIsOpen(val);
        if (!val) handleReset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Key className="mr-2 h-4 w-4" />
          Add Credential
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Credential</DialogTitle>
          <DialogDescription>
            Configure authentication for this MCP server.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Authentication Type</label>
            <div className="flex flex-wrap gap-2">
              {AUTH_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setAuthType(type.id)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    authType === type.id
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <type.icon className="h-4 w-4" />
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="cred-label" className="text-sm font-medium">
              Label
            </label>
            <Input
              id="cred-label"
              placeholder="e.g. Production Key, Personal Access"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
          </div>

          {(authType === "api_key" || authType === "bearer") && (
            <div className="space-y-2">
              <label htmlFor="cred-key" className="text-sm font-medium">
                {authType === "api_key" ? "API Key" : "Token Value"}
              </label>
              <Input
                id="cred-key"
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="sk_..."
                required
                className="font-mono"
              />
            </div>
          )}

          {(authType === "oauth2_authcode" ||
            authType === "oauth2_client_creds") && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Provider</label>
                <ProviderPicker
                  selectedProviderId={
                    selectedProvider === "custom"
                      ? "custom"
                      : selectedProvider?.id
                  }
                  onSelect={onProviderSelect}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="cred-client-id" className="text-sm font-medium">
                    Client ID
                  </label>
                  <Input
                    id="cred-client-id"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="cred-client-secret" className="text-sm font-medium">
                    Client Secret
                  </label>
                  <Input
                    id="cred-client-secret"
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="cred-scopes" className="text-sm font-medium">
                  Scopes (comma or space separated)
                </label>
                <Input
                  id="cred-scopes"
                  placeholder={
                    selectedProvider && selectedProvider !== "custom"
                      ? `Default: ${selectedProvider.defaultScopes.join(", ")}`
                      : "read, write"
                  }
                  value={scopes}
                  onChange={(e) => setScopes(e.target.value)}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {authType === "oauth2_authcode"
              ? "Connect with OAuth"
              : "Save Credential"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
