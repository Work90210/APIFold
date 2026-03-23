"use client";

// Use relative time formatting without date-fns dependency
import { Trash2, Key, Globe } from "lucide-react";
import { Badge, Button, Card } from "@apifold/ui";
import type { SafeCredential } from "@apifold/types";

interface CredentialListItemProps {
  readonly credential: SafeCredential;
  readonly onDelete: (id: string) => void;
  readonly isDeleting: boolean;
}

export function CredentialListItem({
  credential,
  onDelete,
  isDeleting,
}: CredentialListItemProps) {
  const isExpired =
    credential.tokenExpiresAt && new Date(credential.tokenExpiresAt) < new Date();

  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
            {credential.authType.startsWith("oauth") ? (
              <Globe className="h-4 w-4" />
            ) : (
              <Key className="h-4 w-4" />
            )}
          </div>
          <div>
            <h3 className="font-semibold leading-none tracking-tight">
              {credential.label}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Added {new Date(credential.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="capitalize">
            {credential.authType.replace(/_/g, " ")}
          </Badge>
          {credential.provider && (
            <Badge variant="secondary" className="capitalize">
              {credential.provider}
            </Badge>
          )}
          {credential.tokenExpiresAt && (
            <Badge variant={isExpired ? "destructive" : "default"}>
              {isExpired
                ? "Token expired"
                : `Expires ${new Date(credential.tokenExpiresAt).toLocaleDateString()}`}
            </Badge>
          )}
        </div>

        {credential.scopes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {credential.scopes.map((scope) => (
              <span
                key={scope}
                className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium ring-1 ring-inset ring-gray-500/10"
              >
                {scope}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(credential.id)}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>
    </Card>
  );
}
