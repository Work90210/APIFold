"use client";

import { use } from "react";
import { Skeleton, EmptyState } from "@apifold/ui";
import { Key } from "lucide-react";
import {
  useCredentials,
  useDeleteCredential,
} from "@/lib/hooks/use-credentials";
import { AddCredentialModal } from "@/components/credentials/add-credential-modal";
import { CredentialListItem } from "@/components/credentials/credential-list-item";

export default function ServerCredentialsPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = use(params);
  const { data: credentials, isLoading } = useCredentials(id);
  const deleteCredential = useDeleteCredential();

  const handleDelete = async (credentialId: string) => {
    await deleteCredential.mutateAsync({ serverId: id, credentialId });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Credentials</h2>
        <AddCredentialModal serverId={id} />
      </div>

      {!credentials || credentials.length === 0 ? (
        <EmptyState
          icon={Key}
          title="No credentials"
          description="Add authentication credentials to access protected resources."
        />
      ) : (
        <div className="space-y-4">
          {credentials.map((cred) => (
            <CredentialListItem
              key={cred.id}
              credential={cred}
              onDelete={handleDelete}
              isDeleting={deleteCredential.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
