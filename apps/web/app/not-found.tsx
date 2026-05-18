import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        404
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Page not found
      </h1>
      <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-8 flex items-center gap-4">
        <Link
          href="/"
          className="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-all duration-200 hover:bg-foreground/90 active:scale-[0.98]"
        >
          Go home
        </Link>
        <Link
          href="/marketplace"
          className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Browse marketplace
        </Link>
      </div>
    </div>
  );
}
