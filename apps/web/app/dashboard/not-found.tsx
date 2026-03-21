import Link from "next/link";
import { Button } from "@apifold/ui";

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl bg-card p-8 shadow-sm text-center space-y-4">
        <h1 className="text-fluid-2xl font-bold font-heading tracking-tight">
          Page not found
        </h1>
        <p className="text-sm text-muted-foreground leading-normal">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button asChild className="rounded-lg">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
