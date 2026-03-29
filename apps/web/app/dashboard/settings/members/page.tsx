"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Users, Plus, Trash2, Shield } from "lucide-react";
import { Button, Skeleton, EmptyState, Badge } from "@apifold/ui";
import { cn } from "@apifold/ui";
import { useWorkspaces, useWorkspace, useInviteMember, useRemoveMember } from "@/lib/hooks";
import type { WorkspaceRole } from "@apifold/types";

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<WorkspaceRole, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "default",
  member: "secondary",
  viewer: "outline",
};

export default function MembersPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  // Prefer explicit workspace from URL, fall back to first owned workspace
  const explicitId = searchParams.get("workspace");
  const ownedWorkspace = workspaces?.find((w) => w.slug.startsWith("user-")) ?? workspaces?.[0];
  const workspaceId = explicitId ?? ownedWorkspace?.id ?? "";
  const { data: workspace, isLoading } = useWorkspace(workspaceId);
  const inviteMember = useInviteMember();
  const removeMember = useRemoveMember();

  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("member");

  const handleInvite = () => {
    if (!email || !workspaceId) return;
    inviteMember.mutate(
      { workspaceId, email, role },
      {
        onSuccess: () => {
          setEmail("");
          setShowInvite(false);
        },
      },
    );
  };

  const handleRemove = (userId: string) => {
    if (!workspaceId) return;
    removeMember.mutate({ workspaceId, userId });
  };

  if (workspacesLoading || (isLoading && workspaceId)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold tracking-tight">Members</h1>
        <div className="rounded-lg border border-border p-12">
          <EmptyState
            icon={Users}
            title="No workspace selected"
            description="Create or select a workspace to manage members."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Members</h1>
        <Button size="sm" onClick={() => setShowInvite(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Invite
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Manage who has access to <span className="font-medium text-foreground">{workspace.name}</span>.
      </p>

      {/* Invite form */}
      {showInvite && (
        <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
          <h3 className="text-sm font-medium">Invite a team member</h3>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              aria-label="Email address"
              className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as WorkspaceRole)}
              aria-label="Role"
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="viewer">Viewer</option>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleInvite} disabled={!email || inviteMember.isPending}>
              {inviteMember.isPending ? "Sending..." : "Send Invite"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Members list */}
      {workspace.members.length > 0 ? (
        <div className="rounded-lg border border-border">
          {workspace.members.map((member, i) => (
            <div
              key={member.userId}
              className={cn(
                "flex items-center gap-4 px-4 py-3",
                i < workspace.members.length - 1 && "border-b border-border/50",
              )}
            >
              <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono truncate">{member.userId}</p>
                {!member.acceptedAt && (
                  <p className="text-[10px] text-muted-foreground">Pending invitation</p>
                )}
              </div>
              <Badge variant={ROLE_COLORS[member.role as WorkspaceRole] ?? "secondary"} className="text-[10px] px-1.5 py-0 shrink-0">
                {ROLE_LABELS[member.role as WorkspaceRole] ?? member.role}
              </Badge>
              {member.role !== "owner" && member.userId !== user?.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleRemove(member.userId)}
                  disabled={removeMember.isPending}
                  aria-label={`Remove ${member.userId}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border p-12">
          <EmptyState
            icon={Users}
            title="No members yet"
            description="Invite team members to collaborate on this workspace."
          />
        </div>
      )}

      {/* Role descriptions */}
      <div className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-medium mb-3">Role Permissions</h3>
        <dl className="space-y-2 text-xs text-muted-foreground">
          <div><dt className="inline font-medium text-foreground">Viewer</dt> — Read specs, servers, tools, analytics</div>
          <div><dt className="inline font-medium text-foreground">Member</dt> — + execute tools, create/edit specs and servers</div>
          <div><dt className="inline font-medium text-foreground">Admin</dt> — + manage credentials, server config, members</div>
          <div><dt className="inline font-medium text-foreground">Owner</dt> — + delete workspace, billing, transfer ownership</div>
        </dl>
      </div>
    </div>
  );
}
