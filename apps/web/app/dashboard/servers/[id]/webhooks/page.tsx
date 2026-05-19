"use client";

import { use, useState } from "react";
import {
  Webhook,
  ChevronDown,
  ChevronRight,
  Play,
  Shield,
  ShieldCheck,
  ShieldOff,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Skeleton,
  EmptyState,
  CopyButton,
  Badge,
  Button,
  StatusDot,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@apifold/ui";
import {
  useServer,
  useWebhookEvents,
  useWebhookConfig,
  useSetWebhookConfig,
  useClearWebhookConfig,
} from "@/lib/hooks";
import type { WebhookEvent } from "@/lib/hooks";

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "apifold.dev";

const PROVIDERS = [
  { value: "stripe", label: "Stripe", header: "stripe-signature" },
  { value: "github", label: "GitHub", header: "x-hub-signature-256" },
  { value: "slack", label: "Slack", header: "x-slack-signature" },
  { value: "generic", label: "Generic HMAC", header: "x-webhook-signature" },
] as const;

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Group events by their event name to derive "webhook endpoints" */
function deriveWebhooks(events: readonly WebhookEvent[], baseUrl: string) {
  const grouped = new Map<string, WebhookEvent[]>();
  for (const event of events) {
    const existing = grouped.get(event.eventName) ?? [];
    existing.push(event);
    grouped.set(event.eventName, existing);
  }

  return Array.from(grouped.entries()).map(([eventName, evts]) => ({
    eventName,
    url: `${baseUrl}/${eventName}`,
    deliveries: evts.length,
    lastFired: evts[0]?.receivedAt ?? null,
    events: evts,
  }));
}

/* ─── Signature Config Section ─── */

function SignatureConfig({ serverId }: { readonly serverId: string }) {
  const { data: config, isLoading } = useWebhookConfig(serverId);
  const setConfig = useSetWebhookConfig();
  const clearConfig = useClearWebhookConfig();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [provider, setProvider] = useState("generic");
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await setConfig.mutateAsync({ serverId, provider, secret });
      setDialogOpen(false);
      setSecret("");
      setShowSecret(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save webhook config");
    }
  };

  const handleRemove = async () => {
    try {
      await clearConfig.mutateAsync(serverId);
    } catch {
      // Error handled by mutation state
    }
  };

  if (isLoading) {
    return <Skeleton className="h-20 rounded-lg" />;
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Signature Validation</span>
        </div>
        {config?.configured ? (
          <Badge variant="secondary" className="text-[10px] gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            {config.provider}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] gap-1 text-amber-500 border-amber-500/30">
            <AlertTriangle className="h-3 w-3" />
            Not configured
          </Badge>
        )}
      </div>
      <div className="p-4 space-y-3">
        {config?.configured ? (
          <>
            <p className="text-xs text-muted-foreground">
              Incoming webhooks are verified using <strong>{config.provider}</strong> HMAC signature validation.
              Only requests with a valid signature will be accepted.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setProvider(config.provider ?? "generic");
                  setSecret("");
                  setDialogOpen(true);
                }}
              >
                Rotate secret
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-destructive hover:text-destructive"
                onClick={handleRemove}
                disabled={clearConfig.isPending}
              >
                {clearConfig.isPending ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <ShieldOff className="mr-1 h-3 w-3" />
                )}
                Remove
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-md bg-amber-500/5 border border-amber-500/20 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
              Webhook signature validation is not configured. All incoming requests will be rejected.
              Configure a signing secret to start receiving webhooks.
            </div>
            <Button
              size="sm"
              className="text-xs bg-violet-600 hover:bg-violet-700 text-white"
              onClick={() => {
                setProvider("generic");
                setSecret("");
                setError(null);
                setDialogOpen(true);
              }}
            >
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              Configure signing secret
            </Button>
          </>
        )}
      </div>

      {/* Configure / Rotate dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {config?.configured ? "Rotate Webhook Secret" : "Configure Webhook Signing"}
            </DialogTitle>
            <DialogDescription>
              Enter the signing secret from your webhook provider. This secret is encrypted at rest
              and used to verify incoming request signatures.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Provider selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Provider</label>
              <div className="grid grid-cols-2 gap-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setProvider(p.value)}
                    className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                      provider === p.value
                        ? "border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Validates via <code className="rounded bg-muted px-1 py-0.5 font-mono">
                  {PROVIDERS.find((p) => p.value === provider)?.header}
                </code> header
              </p>
            </div>

            {/* Secret input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Signing secret</label>
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  placeholder="whsec_..."
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="pr-10 font-mono text-xs"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-violet-600 hover:bg-violet-700 text-white"
                disabled={!secret || secret.length < 8 || setConfig.isPending}
              >
                {setConfig.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {config?.configured ? "Rotate" : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Event Components ─── */

function EventRow({ event }: { readonly event: WebhookEvent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-muted/30"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <Badge variant="secondary" className="shrink-0 font-mono text-[10px] px-1.5 py-0">
          {event.eventName}
        </Badge>
        <span className="flex-1 truncate text-xs text-muted-foreground">
          {JSON.stringify(event.payload).slice(0, 120)}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {formatTimestamp(event.receivedAt)}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border/30 bg-muted/20 px-4 py-3">
          <pre className="overflow-x-auto rounded-md bg-background p-3 text-xs font-mono leading-relaxed">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function WebhookCard({
  webhook,
}: {
  readonly webhook: {
    readonly eventName: string;
    readonly url: string;
    readonly deliveries: number;
    readonly lastFired: string | null;
    readonly events: readonly WebhookEvent[];
  };
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Card header */}
      <div className="flex items-start gap-3 p-4">
        <StatusDot variant="online" className="mt-1.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <code className="truncate font-mono text-sm font-medium">{webhook.url}</code>
            <CopyButton value={webhook.url} className="h-6 w-6 shrink-0" />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
              {webhook.eventName}
            </Badge>
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="tabular-nums">{webhook.deliveries} deliveries</span>
            {webhook.lastFired && (
              <span>Last fired {timeAgo(webhook.lastFired)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setExpanded((prev) => !prev)}
          >
            <Play className="mr-1 h-3 w-3" />
            {expanded ? "Hide" : "Events"}
          </Button>
        </div>
      </div>

      {/* Expanded event log */}
      {expanded && webhook.events.length > 0 && (
        <div className="border-t border-border">
          {webhook.events.slice(0, 10).map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
          {webhook.events.length > 10 && (
            <div className="px-4 py-2 text-center text-xs text-muted-foreground">
              +{webhook.events.length - 10} more events
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Page ─── */

export default function WebhooksPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = use(params);
  const { data: server, isLoading: serverLoading } = useServer(id);
  const { data: events, isLoading: eventsLoading, isError: eventsError } = useWebhookEvents(id);

  if (serverLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (!server) return null;

  const webhookBaseUrl = `https://${PLATFORM_DOMAIN}/webhooks/${server.slug}`;
  const webhookUrl = `${webhookBaseUrl}/<event-name>`;
  const webhooks = events ? deriveWebhooks(events, webhookBaseUrl) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Webhooks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Receive real-time event notifications for {server.name}
        </p>
      </div>

      {/* Signature validation config */}
      <SignatureConfig serverId={id} />

      {/* Webhook endpoint URL */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <span className="text-sm font-medium">Webhook Endpoint</span>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Send webhook events to this URL. Replace <code className="rounded bg-muted px-1 py-0.5 font-mono">&lt;event-name&gt;</code> with
            the event type (e.g. <code className="rounded bg-muted px-1 py-0.5 font-mono">payment.completed</code>).
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-muted/50 px-3 py-2 font-mono text-xs break-all">
              POST {webhookUrl}
            </code>
            <CopyButton value={webhookUrl} className="h-7 w-7 shrink-0" />
          </div>
        </div>
      </div>

      {/* Webhook cards */}
      {eventsError ? (
        <div className="rounded-lg border border-destructive/30 p-6 text-center">
          <p className="text-sm text-destructive">Failed to load webhook events. Please try again.</p>
        </div>
      ) : eventsLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      ) : webhooks.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Active Webhooks</h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {events?.length ?? 0} total events
            </span>
          </div>
          {webhooks.map((wh) => (
            <WebhookCard key={wh.eventName} webhook={wh} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border p-12">
          <EmptyState
            icon={Webhook}
            title="No webhook events yet"
            description="Events will appear here once your webhook endpoint receives its first request."
          />
        </div>
      )}
    </div>
  );
}
