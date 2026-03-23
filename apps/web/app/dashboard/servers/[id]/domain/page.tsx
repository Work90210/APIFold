"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  Copy,
  RefreshCw,
  Plus,
} from "lucide-react";
import { Button, Input, Badge, Skeleton } from "@apifold/ui";
import { cn } from "@apifold/ui";
import { api } from "@/lib/api-client";
import { useServer } from "@/lib/hooks";

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "apifold.dev";

interface DomainStatus {
  readonly customDomain: string | null;
  readonly domainVerifiedAt: string | null;
  readonly dnsHealthy: boolean | null;
  readonly verificationRecord: string | null;
}

interface SetDomainResponse {
  readonly customDomain: string;
  readonly verificationRecord: string;
  readonly verificationValue: string;
  readonly instructions: string;
}

export default function ServerDomainPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = use(params);
  const { data: server } = useServer(id);
  const queryClient = useQueryClient();

  const [newDomain, setNewDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  const { data: status, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["servers", id, "domain"],
    queryFn: () => api.get<DomainStatus>(`/servers/${id}/domain`),
  });

  const setDomain = useMutation({
    mutationFn: (domain: string) =>
      api.put<SetDomainResponse>(`/servers/${id}/domain`, { domain }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["servers", id] });
      refetch();
      setNewDomain("");
      setError(null);
      setShowSetup(false);
      setVerificationToken(data.verificationValue);
    },
    onError: (err: Error) => setError(err.message),
  });

  const verifyDomain = useMutation({
    mutationFn: () => api.post<{ verified: boolean }>(`/servers/${id}/domain`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers", id] });
      refetch();
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const removeDomain = useMutation({
    mutationFn: () => api.delete<{ deleted: boolean }>(`/servers/${id}/domain`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers", id] });
      refetch();
      setVerificationToken(null);
    },
  });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-[300px]" /></div>;
  }

  const hasDomain = !!status?.customDomain;
  const isVerified = !!status?.domainVerifiedAt;
  const dnsHealthy = status?.dnsHealthy;

  // Determine overall status
  const domainState: "none" | "pending" | "verified" | "error" = !hasDomain
    ? "none"
    : !isVerified
      ? "pending"
      : dnsHealthy === false
        ? "error"
        : "verified";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Domain</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {hasDomain ? (
        <>
          {/* Domain status card — Vercel-style */}
          <div className="rounded-lg border border-border/60 overflow-hidden">
            {/* Status bar */}
            <div className={cn(
              "flex items-center justify-between px-4 py-2.5 text-sm",
              domainState === "verified" && "bg-status-success-muted",
              domainState === "pending" && "bg-status-warning-muted",
              domainState === "error" && "bg-status-error-muted",
            )}>
              <div className="flex items-center gap-2">
                {domainState === "verified" && <CheckCircle2 className="h-4 w-4 text-status-success" />}
                {domainState === "pending" && <AlertTriangle className="h-4 w-4 text-status-warning" />}
                {domainState === "error" && <XCircle className="h-4 w-4 text-status-error" />}
                <span className={cn(
                  "font-medium",
                  domainState === "verified" && "text-status-success",
                  domainState === "pending" && "text-status-warning",
                  domainState === "error" && "text-status-error",
                )}>
                  {domainState === "verified" && "Valid Configuration"}
                  {domainState === "pending" && "Pending Verification"}
                  {domainState === "error" && "Invalid Configuration"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => removeDomain.mutate()}
                disabled={removeDomain.isPending}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Remove
              </Button>
            </div>

            {/* Domain info */}
            <div className="bg-card px-4 py-4">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-mono font-semibold">{status.customDomain}</span>
                {isVerified && (
                  <span className="text-xs text-muted-foreground">→ {server?.name}</span>
                )}
              </div>

              {isVerified && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Endpoint: <code className="font-mono">https://{status.customDomain}/sse</code>
                </p>
              )}

              {domainState === "error" && (
                <p className="mt-2 text-xs text-status-error">
                  The CNAME record for this domain is no longer pointing to <code className="font-mono">{PLATFORM_DOMAIN}</code>.
                  Update your DNS settings to restore the connection.
                </p>
              )}
            </div>
          </div>

          {/* DNS Configuration table */}
          <div>
            <h3 className="mb-3 text-sm font-medium">
              {isVerified ? "DNS Configuration" : "Required DNS Records"}
            </h3>
            <div className="overflow-hidden rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground w-16">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Value</th>
                    <th className="px-4 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-4 py-2.5"><code className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">CNAME</code></td>
                    <td className="px-4 py-2.5 font-mono text-xs">{status.customDomain}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{PLATFORM_DOMAIN}</td>
                    <td className="px-4 py-2.5"><CopyBtn value={PLATFORM_DOMAIN} /></td>
                  </tr>
                  {!isVerified && status.verificationRecord && (
                    <tr>
                      <td className="px-4 py-2.5"><code className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">TXT</code></td>
                      <td className="px-4 py-2.5 font-mono text-xs">{status.verificationRecord}</td>
                      <td className="px-4 py-2.5 font-mono text-xs max-w-[200px] truncate">
                        {verificationToken ?? "(set during setup)"}
                      </td>
                      <td className="px-4 py-2.5">
                        {verificationToken && <CopyBtn value={verificationToken} />}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Verify button for pending domains */}
          {!isVerified && (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => verifyDomain.mutate()}
                disabled={verifyDomain.isPending}
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", verifyDomain.isPending && "animate-spin")} />
                {verifyDomain.isPending ? "Checking..." : "Verify"}
              </Button>
              <span className="text-xs text-muted-foreground">
                DNS propagation can take up to 48 hours.
              </span>
            </div>
          )}
        </>
      ) : showSetup ? (
        <div className="max-w-lg">
          <div className="rounded-lg border border-border/60 bg-card p-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Domain</label>
              <Input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="mcp.yourcompany.com"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Enter the exact domain you want to point to this server. Subdomains recommended.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setDomain.mutate(newDomain)}
                disabled={!newDomain || setDomain.isPending}
              >
                {setDomain.isPending ? "Adding..." : "Add"}
              </Button>
              <Button variant="ghost" onClick={() => { setShowSetup(false); setError(null); }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border/50 p-10 text-center">
          <Globe className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <h3 className="mt-3 text-sm font-semibold">No domain configured</h3>
          <p className="mt-1 text-xs text-muted-foreground mx-auto max-w-sm">
            Currently using <code className="font-mono">{PLATFORM_DOMAIN}/mcp/{server?.endpointId}/sse</code>.
            Add a custom domain for a branded MCP endpoint.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => setShowSetup(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Domain
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-status-error">{error}</p>}
    </div>
  );
}

function CopyBtn({ value }: { readonly value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-status-success" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
