"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Plus, Trash2, GripVertical, Wrench } from "lucide-react";
import { Button, Skeleton, Badge, CopyButton, EmptyState } from "@apifold/ui";
import { cn } from "@apifold/ui";
import { useComposite, useUpdateComposite, useDeleteComposite, useServers, useTools } from "@/lib/hooks";
import type { CompositeMember } from "@apifold/types";

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "apifold.dev";

interface MemberEditorProps {
  readonly members: readonly CompositeMember[];
  readonly onUpdate: (members: readonly { serverId: string; namespace: string; displayOrder: number }[]) => void;
}

function MemberEditor({ members, onUpdate }: MemberEditorProps) {
  const { data: servers } = useServers();
  const [adding, setAdding] = useState(false);
  const [newServerId, setNewServerId] = useState("");
  const [newNamespace, setNewNamespace] = useState("");

  const handleRemove = (serverId: string) => {
    const updated = members
      .filter((m) => m.serverId !== serverId)
      .map((m, i) => ({ serverId: m.serverId, namespace: m.namespace, displayOrder: i }));
    onUpdate(updated);
  };

  const handleAdd = () => {
    if (!newServerId || !newNamespace) return;
    if (members.some((m) => m.serverId === newServerId || m.namespace === newNamespace)) return;

    const updated = [
      ...members.map((m, i) => ({ serverId: m.serverId, namespace: m.namespace, displayOrder: i })),
      { serverId: newServerId, namespace: newNamespace, displayOrder: members.length },
    ];
    onUpdate(updated);
    setNewServerId("");
    setNewNamespace("");
    setAdding(false);
  };

  const availableServers = servers?.filter((s) => !members.some((m) => m.serverId === s.id)) ?? [];

  return (
    <div className="space-y-3">
      {members.map((member) => (
        <div
          key={member.serverId}
          className="flex items-center gap-3 rounded-md border border-border p-3"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 cursor-grab" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs shrink-0">
                {member.namespace}
              </Badge>
              <span className="text-sm truncate">{member.serverName ?? member.serverId}</span>
            </div>
            {member.serverSlug && (
              <p className="mt-0.5 text-xs text-muted-foreground font-mono">{member.serverSlug}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => handleRemove(member.serverId)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      {adding ? (
        <div className="rounded-md border border-dashed border-border p-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={newServerId}
              onChange={(e) => {
                setNewServerId(e.target.value);
                // Auto-fill namespace from server slug
                const server = availableServers.find((s) => s.id === e.target.value);
                if (server && !newNamespace) {
                  setNewNamespace(server.slug.replace(/-/g, '_'));
                }
              }}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">Select server...</option>
              {availableServers.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.slug})</option>
              ))}
            </select>
            <div>
              <input
                type="text"
                value={newNamespace}
                onChange={(e) => setNewNamespace(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="namespace (a-z, 0-9, _)"
                maxLength={30}
                className={cn(
                  "w-full rounded-md border bg-background px-3 py-1.5 text-sm font-mono",
                  newNamespace && !/^[a-z0-9_]+$/.test(newNamespace)
                    ? "border-destructive"
                    : "border-border",
                )}
              />
              {newNamespace && newNamespace.length > 0 && !/^[a-z0-9_]+$/.test(newNamespace) && (
                <p className="mt-1 text-[10px] text-destructive">Only lowercase letters, numbers, and underscores</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={!newServerId || !newNamespace || !/^[a-z0-9_]+$/.test(newNamespace)}>
              Add Member
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="w-full">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Member Server
        </Button>
      )}
    </div>
  );
}

function ToolPreview({ members }: { readonly members: readonly CompositeMember[] }) {
  return (
    <div className="space-y-2">
      {members.map((member) => (
        <NamespaceToolList key={member.serverId} member={member} />
      ))}
      {members.length === 0 && (
        <p className="text-xs text-muted-foreground py-4 text-center">
          Add member servers to see merged tool list
        </p>
      )}
    </div>
  );
}

function NamespaceToolList({ member }: { readonly member: CompositeMember }) {
  const { data: tools, isLoading } = useTools(member.serverId);

  if (isLoading) return <Skeleton className="h-8 rounded" />;

  const activeTools = tools?.filter((t) => t.isActive) ?? [];

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Badge variant="outline" className="font-mono text-[10px] shrink-0">{member.namespace}</Badge>
        <span className="text-xs text-muted-foreground">{activeTools.length} tools</span>
      </div>
      <div className="ml-4 space-y-0.5">
        {activeTools.map((tool) => (
          <div key={tool.id} className="flex items-center gap-1.5 text-xs">
            <Wrench className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            <span className="font-mono text-muted-foreground">{member.namespace}__</span>
            <span className="font-mono">{tool.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CompositeDetailPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: composite, isLoading } = useComposite(id);
  const updateComposite = useUpdateComposite();
  const deleteComposite = useDeleteComposite();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!composite) return null;

  const endpointUrl = `https://${PLATFORM_DOMAIN}/mcp/composite/${composite.slug}`;

  const handleMembersUpdate = (members: readonly { serverId: string; namespace: string; displayOrder: number }[]) => {
    updateComposite.mutate({ id, input: { members } });
  };

  const handleDelete = () => {
    deleteComposite.mutate(id, {
      onSuccess: () => router.push("/dashboard/composites"),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">{composite.name}</h1>
        <Badge variant={composite.isActive ? "default" : "secondary"}>
          {composite.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      {composite.description && (
        <p className="text-sm text-muted-foreground">{composite.description}</p>
      )}

      {/* Endpoint URL */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Composite Endpoint</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {composite.transport.toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md bg-muted/50 px-3 py-2 font-mono text-xs break-all">
            POST {endpointUrl}
          </code>
          <CopyButton value={endpointUrl} className="h-7 w-7 shrink-0" />
        </div>
      </div>

      {/* Members */}
      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-4 py-3">
          <span className="text-sm font-medium">Member Servers</span>
        </div>
        <div className="p-4">
          <MemberEditor
            members={composite.members}
            onUpdate={handleMembersUpdate}
          />
        </div>
      </div>

      {/* Tool preview */}
      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-4 py-3">
          <span className="text-sm font-medium">Merged Tool Preview</span>
        </div>
        <div className="p-4">
          <ToolPreview members={composite.members} />
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-lg border border-destructive/30 p-4">
        <h3 className="text-sm font-medium text-destructive mb-2">Danger Zone</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Deleting this composite server will remove the endpoint permanently. Connected agents will lose access.
        </p>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteComposite.isPending}
            >
              {deleteComposite.isPending ? "Deleting..." : "Confirm delete"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            className="border-destructive/20 text-destructive hover:bg-destructive/5"
          >
            Delete Composite Server
          </Button>
        )}
      </div>
    </div>
  );
}
