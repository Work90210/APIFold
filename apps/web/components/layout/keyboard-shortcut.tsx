export function KeyboardShortcut({
  keys,
}: {
  readonly keys: string;
}) {
  return (
    <kbd className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
      {keys}
    </kbd>
  );
}
