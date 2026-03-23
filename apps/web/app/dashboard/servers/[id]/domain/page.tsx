"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Copy,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
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
  const [setupMode, setSetupMode] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ["servers", id, "domain"],
    queryFn: () => api.get<DomainStatus>(`/servers/${id}/domain`),
    refetchInterval: 30_000, // Re-check DNS health every 30s
  });

  const setDomain = useMutation({
    mutationFn: (domain: string) =>
      api.put<SetDomainResponse>(`/servers/${id}/domain`, { domain }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers", id, "domain"] });
      queryClient.invalidateQueries({ queryKey: ["servers", id] });
      setNewDomain("");
      setError(null);
      setSetupMode(false);
    },
    onError: (err: Error) => setError(err.message),
  });

  const verifyDomain = useMutation({
    mutationFn: () => api.post<{ verified: boolean }>(`/servers/${id}/domain`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers", id, "domain"] });
      queryClient.invalidateQueries({ queryKey: ["servers", id] });
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const removeDomain = useMutation({
    mutationFn: () => api.delete<{ deleted: boolean }>(`/servers/${id}/domain`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers", id, "domain"] });
      queryClient.invalidateQueries({ queryKey: ["servers", id] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px]" />
      </div>
    );
  }

  const hasDomain = !!status?.customDomain;
  const isVerified = !!status?.domainVerifiedAt;
  const dnsHealthy = status?.dnsHealthy;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Custom Domain</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use your own domain instead of <span className="font-mono">{PLATFORM_DOMAIN}/mcp/{server?.endpointId}</span>
        </p>
      </div>

      {hasDomain ? (
        <div className="space-y-6">
          {/* Current domain status */}
          <div className="rounded-lg border border-border/60 bg-card p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {isVerified ? (
                  <CheckCircle2 className="h-5 w-5 text-status-success shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-status-warning shrink-0" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{status.customDomain}</span>
                    <Badge variant={isVerified ? "default" : "outline"} className="text-xs">
                      {isVerified ? "Verified" : "Pending verification"}
                    </Badge>
                  </div>
                  {isVerified && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      MCP endpoint: <span className="font-mono">https://{status.customDomain}/sse</span>
                    </p>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => removeDomain.mutate()}
                disabled={removeDomain.isPending}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Remove
              </Button>
            </div>

            {/* DNS health indicator for verified domains */}
            {isVerified && dnsHealthy !== null && (
              <div className={cn(
                "mt-4 flex items-center gap-2 rounded-md px-3 py-2 text-xs",
                dnsHealthy ? "bg-status-success-muted text-status-success" : "bg-status-error-muted text-status-error",
              )}>
                {dnsHealthy ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    DNS is healthy — CNAME resolves to {PLATFORM_DOMAIN}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    DNS issue detected — CNAME is not pointing to {PLATFORM_DOMAIN}. Check your DNS settings.
                  </>
                )}
              </div>
            )}
          </div>

          {/* DNS setup instructions for unverified domains */}
          {!isVerified && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Configure DNS records</h3>
              <p className="text-sm text-muted-foreground">
                Add these records at your DNS provider, then click Verify.
              </p>

              <div className="space-y-3">
                <DnsRecordCard
                  type="CNAME"
                  name={status.customDomain!}
                  value={PLATFORM_DOMAIN}
                  description="Routes traffic from your domain to APIFold"
                />
                {status.verificationRecord && (
                  <DnsRecordCard
                    type="TXT"
                    name={status.verificationRecord}
                    value="(verification token from setup)"
                    description="Proves you own this domain"
                  />
                )}
              </div>

              <div className="rounded-md bg-muted/30 border border-border/40 px-4 py-3 text-xs text-muted-foreground">
                DNS changes may take up to 48 hours to propagate. You can verify at any time.
              </div>

              <Button
                onClick={() => verifyDomain.mutate()}
                disabled={verifyDomain.isPending}
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", verifyDomain.isPending && "animate-spin")} />
                {verifyDomain.isPending ? "Checking DNS..." : "Verify domain"}
              </Button>
            </div>
          )}
        </div>
      ) : setupMode ? (
        /* Setup new domain */
        <div className="max-w-lg space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Domain</label>
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="mcp.yourcompany.com"
            />
            <p className="text-xs text-muted-foreground">
              Use a subdomain like <span className="font-mono">mcp.</span> or <span className="font-mono">api.</span> — avoid using your root domain.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setDomain.mutate(newDomain)}
              disabled={!newDomain || setDomain.isPending}
            >
              {setDomain.isPending ? "Setting up..." : "Set up domain"}
            </Button>
            <Button variant="outline" onClick={() => setSetupMode(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        /* No domain — prompt to set up */
        <div className="space-y-6">
          <div className="rounded-lg border border-dashed border-border/60 bg-card/30 p-8">
            <div className="flex items-start gap-4">
              <Globe className="h-8 w-8 text-muted-foreground/50 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">No custom domain configured</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-md">
                  Your MCP endpoint is currently accessible at <span className="font-mono">{PLATFORM_DOMAIN}/mcp/{server?.endpointId}/sse</span>.
                  Add a custom domain to use your own URL.
                </p>
                <Button className="mt-4" onClick={() => setSetupMode(true)}>
                  Add custom domain
                </Button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">How it works</h3>
            <div className="grid gap-4 sm:grid-cols-3 text-sm">
              <div>
                <span className="text-xs font-medium text-primary">1.</span>
                <span className="ml-1.5 font-medium">Enter your domain</span>
                <p className="mt-0.5 text-xs text-muted-foreground">e.g., mcp.yourcompany.com</p>
              </div>
              <div>
                <span className="text-xs font-medium text-primary">2.</span>
                <span className="ml-1.5 font-medium">Configure DNS</span>
                <p className="mt-0.5 text-xs text-muted-foreground">Add CNAME + TXT records</p>
              </div>
              <div>
                <span className="text-xs font-medium text-primary">3.</span>
                <span className="ml-1.5 font-medium">Verify & go live</span>
                <p className="mt-0.5 text-xs text-muted-foreground">Click verify — instant activation</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-status-error">{error}</p>
      )}
    </div>
  );
}

function DnsRecordCard({
  type,
  name,
  value,
  description,
}: {
  readonly type: string;
  readonly name: string;
  readonly value: string;
  readonly description: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyValue = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border/40 bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold">{type}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <div className="grid gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground w-16">Name</span>
          <code className="font-mono text-xs">{name}</code>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground w-16">Value</span>
          <div className="flex items-center gap-2">
            <code className="font-mono text-xs">{value}</code>
            <button type="button" onClick={copyValue} className="text-muted-foreground hover:text-foreground transition-colors">
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-status-success" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
