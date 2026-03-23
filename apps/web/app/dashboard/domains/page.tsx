"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Plus,
  ExternalLink,
  Copy,
  RefreshCw,
  Server,
  ArrowRight,
} from "lucide-react";
import { Button, Input, Badge, Skeleton, EmptyState } from "@apifold/ui";
import { cn } from "@apifold/ui";
import { api } from "@/lib/api-client";
import { useServers } from "@/lib/hooks";
import type { McpServer } from "@apifold/types";

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "apifold.dev";

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

export default function DomainsPage() {
  const { data: servers, isLoading: serversLoading } = useServers();
  const [setupServerId, setSetupServerId] = useState<string | null>(null);

  const serversWithDomains = servers?.filter((s) => s.customDomain) ?? [];
  const serversWithoutDomains = servers?.filter((s) => !s.customDomain) ?? [];

  if (serversLoading) {
    return (
      <div className="animate-in space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="animate-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-fluid-3xl font-bold font-heading tracking-tight">Domains</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your own domains for MCP endpoints.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {/* Active domains */}
        {serversWithDomains.length > 0 && (
          <div>
            <h2 className="mb-4 text-sm font-medium text-muted-foreground">
              Active domains ({serversWithDomains.length})
            </h2>
            <div className="space-y-3">
              {serversWithDomains.map((server) => (
                <DomainCard key={server.id} server={server} />
              ))}
            </div>
          </div>
        )}

        {/* Setup new domain */}
        {setupServerId ? (
          <DomainSetupWizard
            serverId={setupServerId}
            serverName={servers?.find((s) => s.id === setupServerId)?.name ?? ""}
            onCancel={() => setSetupServerId(null)}
            onComplete={() => setSetupServerId(null)}
          />
        ) : (
          <div>
            <h2 className="mb-4 text-sm font-medium text-muted-foreground">
              Add a custom domain
            </h2>
            {serversWithoutDomains.length > 0 ? (
              <div className="space-y-2">
                {serversWithoutDomains.map((server) => (
                  <button
                    key={server.id}
                    type="button"
                    onClick={() => setSetupServerId(server.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-card px-4 py-3 text-left transition-colors hover:border-border"
                  >
                    <div className="flex items-center gap-3">
                      <Server className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-sm font-medium">{server.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground font-mono">
                          {PLATFORM_DOMAIN}/mcp/{server.endpointId}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      Add domain <ArrowRight className="h-3 w-3" />
                    </div>
                  </button>
                ))}
              </div>
            ) : servers?.length === 0 ? (
              <EmptyState
                icon={Globe}
                title="No servers yet"
                description="Create an MCP server first, then add a custom domain."
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                All servers already have custom domains configured.
              </p>
            )}
          </div>
        )}

        {/* How it works */}
        <div className="border-t border-border/40 pt-8">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">How it works</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <Step number={1} title="Add your domain" description="Enter the domain you want to use (e.g., mcp.yourcompany.com)" />
            <Step number={2} title="Configure DNS" description="Add a CNAME record pointing to our platform, and a TXT record for verification" />
            <Step number={3} title="Verify & go live" description="Click verify — once confirmed, your MCP endpoint is live on your domain" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DomainCard({ server }: { readonly server: McpServer }) {
  const queryClient = useQueryClient();
  const isVerified = !!server.domainVerifiedAt;

  const { data: domainStatus } = useQuery({
    queryKey: ["servers", server.id, "domain"],
    queryFn: () => api.get<DomainStatus>(`/servers/${server.id}/domain`),
  });

  const verifyDomain = useMutation({
    mutationFn: () => api.post<{ verified: boolean }>(`/servers/${server.id}/domain`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
      queryClient.invalidateQueries({ queryKey: ["servers", server.id, "domain"] });
    },
  });

  const removeDomain = useMutation({
    mutationFn: () => api.delete<{ deleted: boolean }>(`/servers/${server.id}/domain`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
      queryClient.invalidateQueries({ queryKey: ["servers", server.id, "domain"] });
    },
  });

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {isVerified ? (
            <CheckCircle2 className="h-4 w-4 text-status-success shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-status-warning shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-medium">{server.customDomain}</span>
              <Badge variant={isVerified ? "default" : "outline"} className="text-xs">
                {isVerified ? "Verified" : "Pending"}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {server.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isVerified && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => verifyDomain.mutate()}
              disabled={verifyDomain.isPending}
            >
              <RefreshCw className={cn("mr-1.5 h-3 w-3", verifyDomain.isPending && "animate-spin")} />
              {verifyDomain.isPending ? "Checking..." : "Verify"}
            </Button>
          )}
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
      </div>

      {isVerified && (
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span>Endpoint: <span className="font-mono">https://{server.customDomain}/sse</span></span>
        </div>
      )}

      {!isVerified && domainStatus?.verificationRecord && (
        <div className="mt-3 rounded border border-border/40 bg-muted/30 p-3 text-xs space-y-2">
          <p className="font-medium">DNS records needed:</p>
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">CNAME</span>
              <span className="text-muted-foreground">
                <span className="font-mono">{server.customDomain}</span> → <span className="font-mono">{PLATFORM_DOMAIN}</span>
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">TXT</span>
              <span className="text-muted-foreground">
                <span className="font-mono">{domainStatus.verificationRecord}</span> → verification token
              </span>
            </div>
          </div>
          <p className="text-muted-foreground">DNS changes may take up to 48 hours to propagate.</p>
        </div>
      )}

      {verifyDomain.isError && (
        <p className="mt-2 text-xs text-status-error">
          {verifyDomain.error instanceof Error ? verifyDomain.error.message : "Verification failed"}
        </p>
      )}
    </div>
  );
}

function DomainSetupWizard({
  serverId,
  serverName,
  onCancel,
  onComplete,
}: {
  readonly serverId: string;
  readonly serverName: string;
  readonly onCancel: () => void;
  readonly onComplete: () => void;
}) {
  const queryClient = useQueryClient();
  const [domain, setDomain] = useState("");
  const [step, setStep] = useState<"enter" | "dns" | "verify">("enter");
  const [verificationData, setVerificationData] = useState<SetDomainResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setDomainMutation = useMutation({
    mutationFn: (d: string) =>
      api.put<SetDomainResponse>(`/servers/${serverId}/domain`, { domain: d }),
    onSuccess: (data) => {
      setVerificationData(data);
      setStep("dns");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["servers"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const verifyMutation = useMutation({
    mutationFn: () => api.post<{ verified: boolean }>(`/servers/${serverId}/domain`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
      onComplete();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="rounded-xl border border-border/60 bg-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Add custom domain</h2>
          <p className="text-xs text-muted-foreground mt-0.5">for {serverName}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>

      {/* Step indicators */}
      <div className="mb-6 flex items-center gap-2 text-xs">
        <StepIndicator active={step === "enter"} done={step !== "enter"} label="1. Domain" />
        <span className="text-muted-foreground">→</span>
        <StepIndicator active={step === "dns"} done={step === "verify"} label="2. DNS setup" />
        <span className="text-muted-foreground">→</span>
        <StepIndicator active={step === "verify"} done={false} label="3. Verify" />
      </div>

      {step === "enter" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Domain</label>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="mcp.yourcompany.com"
            />
            <p className="text-xs text-muted-foreground">
              Use a subdomain like <span className="font-mono">mcp.</span> or <span className="font-mono">api.</span> — not your root domain.
            </p>
          </div>
          <Button
            onClick={() => setDomainMutation.mutate(domain)}
            disabled={!domain || setDomainMutation.isPending}
          >
            {setDomainMutation.isPending ? "Setting up..." : "Continue"}
          </Button>
        </div>
      )}

      {step === "dns" && verificationData && (
        <div className="space-y-4">
          <p className="text-sm">Add these DNS records to your domain provider:</p>

          <div className="space-y-3">
            <DnsRecord
              type="CNAME"
              name={verificationData.customDomain}
              value={PLATFORM_DOMAIN}
              description="Routes traffic to APIFold"
            />
            <DnsRecord
              type="TXT"
              name={verificationData.verificationRecord}
              value={verificationData.verificationValue}
              description="Proves domain ownership"
            />
          </div>

          <div className="rounded border border-status-info-muted bg-status-info-muted/30 p-3 text-xs text-muted-foreground">
            <p>DNS changes can take up to 48 hours to propagate. You can verify now or come back later.</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setStep("verify")}>
              I've added the records
            </Button>
            <Button variant="outline" onClick={onCancel}>
              I'll do this later
            </Button>
          </div>
        </div>
      )}

      {step === "verify" && (
        <div className="space-y-4">
          <p className="text-sm">Checking DNS records for <span className="font-mono font-medium">{verificationData?.customDomain}</span>...</p>
          <Button
            onClick={() => verifyMutation.mutate()}
            disabled={verifyMutation.isPending}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", verifyMutation.isPending && "animate-spin")} />
            {verifyMutation.isPending ? "Checking DNS..." : "Verify domain"}
          </Button>
          <Button variant="ghost" onClick={() => setStep("dns")}>
            Back to DNS instructions
          </Button>
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-status-error">{error}</p>
      )}
    </div>
  );
}

function DnsRecord({
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
    <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium">{type}</span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Name:</span>
          <code className="font-mono">{name}</code>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Value:</span>
          <div className="flex items-center gap-1.5">
            <code className="font-mono max-w-[200px] truncate">{value}</code>
            <button type="button" onClick={copyValue} className="text-muted-foreground hover:text-foreground transition-colors">
              {copied ? <CheckCircle2 className="h-3 w-3 text-status-success" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  readonly number: number;
  readonly title: string;
  readonly description: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
          {number}
        </span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground pl-7">{description}</p>
    </div>
  );
}

function StepIndicator({
  active,
  done,
  label,
}: {
  readonly active: boolean;
  readonly done: boolean;
  readonly label: string;
}) {
  return (
    <span className={cn(
      "font-medium",
      active && "text-primary",
      done && "text-status-success",
      !active && !done && "text-muted-foreground",
    )}>
      {done && <CheckCircle2 className="inline h-3 w-3 mr-0.5" />}
      {label}
    </span>
  );
}
