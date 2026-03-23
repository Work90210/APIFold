"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { Button, Input, Badge } from "@apifold/ui";

import { api } from "@/lib/api-client";

interface DomainSettingsProps {
  readonly serverId: string;
}

interface DomainStatus {
  readonly customDomain: string | null;
  readonly domainVerifiedAt: string | null;
  readonly verificationRecord: string | null;
}

interface SetDomainResponse {
  readonly customDomain: string;
  readonly verificationRecord: string;
  readonly verificationValue: string;
  readonly instructions: string;
}

export function DomainSettings({ serverId }: DomainSettingsProps) {
  const queryClient = useQueryClient();
  const [newDomain, setNewDomain] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: status } = useQuery({
    queryKey: ["servers", serverId, "domain"],
    queryFn: () => api.get<DomainStatus>(`/servers/${serverId}/domain`),
  });

  const setDomain = useMutation({
    mutationFn: (domain: string) =>
      api.put<SetDomainResponse>(`/servers/${serverId}/domain`, { domain }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers", serverId, "domain"] });
      setNewDomain("");
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const verifyDomain = useMutation({
    mutationFn: () => api.post<{ verified: boolean }>(`/servers/${serverId}/domain`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers", serverId, "domain"] });
      queryClient.invalidateQueries({ queryKey: ["servers", serverId] });
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const removeDomain = useMutation({
    mutationFn: () => api.delete<{ deleted: boolean }>(`/servers/${serverId}/domain`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers", serverId, "domain"] });
      queryClient.invalidateQueries({ queryKey: ["servers", serverId] });
    },
  });

  const isVerified = !!status?.domainVerifiedAt;
  const hasDomain = !!status?.customDomain;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Custom Domain</h3>
        {hasDomain && (
          <Badge variant={isVerified ? "default" : "outline"} className="text-xs">
            {isVerified ? "Verified" : "Pending"}
          </Badge>
        )}
      </div>

      {hasDomain ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isVerified ? (
                <CheckCircle2 className="h-4 w-4 text-status-success" />
              ) : (
                <AlertCircle className="h-4 w-4 text-status-warning" />
              )}
              <span className="text-sm font-mono font-medium">{status.customDomain}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => removeDomain.mutate()}
              disabled={removeDomain.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {!isVerified && status.verificationRecord && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm space-y-3">
              <p className="text-muted-foreground">
                Add a DNS TXT record to verify ownership:
              </p>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Record name</span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-2 py-1 text-xs font-mono">
                    {status.verificationRecord}
                  </code>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                DNS records may take up to 48 hours to propagate.
              </p>
              <Button
                size="sm"
                onClick={() => verifyDomain.mutate()}
                disabled={verifyDomain.isPending}
              >
                {verifyDomain.isPending ? "Checking..." : "Verify DNS"}
              </Button>
            </div>
          )}

          {isVerified && (
            <p className="text-xs text-muted-foreground">
              MCP clients can connect via <span className="font-mono">https://{status.customDomain}/sse</span>
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Use your own domain for MCP endpoints instead of the default platform URL.
          </p>
          <div className="flex gap-2">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="mcp.yourcompany.com"
              className="flex-1"
            />
            <Button
              onClick={() => setDomain.mutate(newDomain)}
              disabled={!newDomain || setDomain.isPending}
            >
              {setDomain.isPending ? "Setting..." : "Set Domain"}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-status-error">{error}</p>
      )}
    </div>
  );
}
