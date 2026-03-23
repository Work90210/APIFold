"use client";

import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { User } from "lucide-react";
import { Skeleton } from "@apifold/ui";

export function AccountSection() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Account
        </h2>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 h-full">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Account
      </h2>

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {user?.imageUrl ? (
            <Image
              src={user.imageUrl}
              alt={user.fullName ?? "Avatar"}
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight">
            {user?.fullName ?? "Unknown"}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {user?.primaryEmailAddress?.emailAddress ?? "No email"}
          </p>
        </div>
      </div>

      <dl className="mt-4 pt-4 border-t border-border/40 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Member since</dt>
          <dd className="font-medium tabular-nums">
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                })
              : "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
