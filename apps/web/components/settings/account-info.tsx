"use client";

import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { User } from "lucide-react";
import { Skeleton } from "@apifold/ui";

export function AccountInfo() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="rounded-xl bg-card shadow-sm p-6">
        <Skeleton className="mb-6 h-5 w-24 rounded-lg" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>
    );
  }

  const avatarUrl = user?.imageUrl;

  return (
    <div className="rounded-xl bg-card shadow-sm p-6">
      <h2 className="text-fluid-xl font-semibold font-heading tracking-tight text-muted-foreground mb-6">
        Account
      </h2>

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={user?.fullName ?? "Avatar"}
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-7 w-7 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold font-heading tracking-tight">
            {user?.fullName ?? "Unknown"}
          </p>
          <p className="truncate text-sm text-muted-foreground leading-normal">
            {user?.primaryEmailAddress?.emailAddress ?? "No email"}
          </p>
        </div>
      </div>

      <div className="border-t border-border/40 mt-6" />

      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Member since</dt>
          <dd className="font-medium tabular-nums">
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "\u2014"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
