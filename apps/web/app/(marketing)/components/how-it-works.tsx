import { FileJson, Zap, Bot } from "lucide-react";

const STEPS = [
  {
    icon: FileJson,
    step: "01",
    title: "Import",
    description: "Drop an OpenAPI spec URL or upload a JSON/YAML file.",
  },
  {
    icon: Zap,
    step: "02",
    title: "Configure",
    description: "Set auth mode, rate limits, and enable/disable tools.",
  },
  {
    icon: Bot,
    step: "03",
    title: "Connect",
    description: "Paste a 5-line JSON config into Claude Desktop or Cursor.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="relative border-t border-[#40485d]/50 px-6 py-28 md:py-36">
      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a7a5ff]">
            How It Works
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Three steps. 60 seconds.
          </h2>
        </div>

        <div className="relative mt-16">
          {/* Connector line */}
          <div
            className="absolute left-0 right-0 top-10 hidden h-px bg-gradient-to-r from-transparent via-[#a7a5ff]/30 to-transparent md:block"
            aria-hidden="true"
          />

          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, step, title, description }) => (
              <div key={step} className="relative text-center">
                <div className="relative z-10 mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#40485d]/50 bg-[#0f1930] ring-1 ring-white/10">
                  <Icon className="h-7 w-7 text-[#a7a5ff]" />
                </div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest tabular-nums text-[#a7a5ff]/60">
                  Step {step}
                </p>
                <h3 className="font-heading text-xl font-bold tracking-tight text-white">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#a3aac4]">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
