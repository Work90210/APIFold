const CLIENTS = [
  { name: "Claude Desktop", label: "claude" },
  { name: "Cursor", label: "cursor" },
  { name: "GitHub Copilot", label: "copilot" },
  { name: "Windsurf", label: "windsurf" },
  { name: "Continue", label: "continue" },
] as const;

export function WorksWithBar() {
  return (
    <section className="border-t border-[#40485d]/50 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#6d758c]">
          Works with every MCP client
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {CLIENTS.map(({ name }) => (
            <div
              key={name}
              className="rounded-full border border-[#40485d]/50 bg-[#0f1930]/40 px-5 py-2 text-sm font-medium text-[#a3aac4] transition-colors duration-200 hover:border-[#a7a5ff]/30 hover:text-white"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
