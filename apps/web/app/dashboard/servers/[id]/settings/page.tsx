"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Skeleton, StatusDot } from "@apifold/ui";
import { cn } from "@apifold/ui";
import { useServer, useUpdateServer, useDeleteServer } from "@/lib/hooks";

export default function ServerSettingsPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: server, isLoading } = useServer(id);
  const updateServer = useUpdateServer();
  const deleteServer = useDeleteServer();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  if (!server) return null;

  const handleToggleActive = () => {
    updateServer.mutate({
      id: server.id,
      input: { isActive: !server.isActive },
    });
  };

  const handleDelete = async () => {
    await deleteServer.mutateAsync(server.id);
    router.push("/dashboard");
  };

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold tracking-tight">Settings</h1>

      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <h2 className="text-sm font-medium">Server status</h2>
            <div className="mt-1 flex items-center gap-1.5">
              <StatusDot variant={server.isActive ? "online" : "offline"} />
              <span className={cn(
                "text-xs",
                server.isActive ? "text-status-success" : "text-muted-foreground",
              )}>
                {server.isActive ? "Live — accepting connections" : "Offline — connections rejected"}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleActive}
            disabled={updateServer.isPending}
          >
            {server.isActive ? "Disable" : "Enable"}
          </Button>
        </div>

        <div className="rounded-lg border border-destructive/20 p-4">
          <h2 className="text-sm font-medium text-destructive">Danger zone</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Permanently delete this server. This cannot be undone.
          </p>
          <div className="mt-4">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteServer.isPending}
                >
                  {deleteServer.isPending ? "Deleting..." : "Confirm delete"}
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
                Delete server
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
