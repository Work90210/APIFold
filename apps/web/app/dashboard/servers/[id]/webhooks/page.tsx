"use client";

import { use, useState } from "react";
import { Webhook, ChevronDown, ChevronRight } from "lucide-react";
import { Skeleton, EmptyState, CopyButton, Badge } from "@apifold/ui";
import { useServer, useWebhookEvents } from "@/lib/hooks";
import type { WebhookEvent } from "@/lib/hooks";

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "apifold.dev";

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
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!server) return null;

  const webhookUrl = `https://${PLATFORM_DOMAIN}/webhooks/${server.slug}/<event-name>`;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold tracking-tight">Webhooks</h1>

      {/* Webhook endpoint URL */}
      <div className="rounded-lg border border-border">
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
          <div className="rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Signature validation is supported for Stripe, GitHub, and Slack webhooks.
            Events are stored for 24 hours and available as MCP resources.
          </div>
        </div>
      </div>

      {/* Event log */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium">Recent Events</h2>
          {events && events.length > 0 && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {events.length} event{events.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {eventsError ? (
          <div className="rounded-lg border border-destructive/30 p-6 text-center">
            <p className="text-sm text-destructive">Failed to load webhook events. Please try again.</p>
          </div>
        ) : eventsLoading ? (
          <Skeleton className="h-64 rounded-lg" />
        ) : events && events.length > 0 ? (
          <div className="rounded-lg border border-border">
            {events.map((event) => (
              <EventRow key={event.id} event={event} />
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
    </div>
  );
}
