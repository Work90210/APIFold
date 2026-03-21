"use client";

import { Button } from "@apifold/ui";

interface ErrorPageProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorPageProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl bg-card p-8 shadow-sm text-center space-y-4">
        <h1 className="text-fluid-2xl font-bold font-heading tracking-tight">
          Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground leading-normal">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <Button onClick={reset} className="rounded-lg">
          Try again
        </Button>
      </div>
    </div>
  );
}
