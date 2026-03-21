export function PageHeader({
  title,
  description,
}: {
  readonly title: string;
  readonly description?: string;
}) {
  return (
    <div>
      <h1 className="text-fluid-3xl font-bold font-heading tracking-tight">
        {title}
      </h1>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground leading-normal max-w-prose">
          {description}
        </p>
      )}
    </div>
  );
}
