const CLIENTS = [
  { name: "Claude Desktop", label: "claude" },
  { name: "Cursor", label: "cursor" },
  { name: "GitHub Copilot", label: "copilot" },
  { name: "Windsurf", label: "windsurf" },
  { name: "Continue", label: "continue" },
] as const;

export function WorksWithBar() {
  return (
    <section className="border-t border-border px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
          Works with every MCP client
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {CLIENTS.map(({ name }) => (
            <div
              key={name}
              className="rounded-full border border-border px-5 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
