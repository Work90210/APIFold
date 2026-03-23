import {
  Globe,
  Terminal,
  Download,
  ArrowRight,
  Github,
  Users,
} from "lucide-react";

const GITHUB_REPO = "https://github.com/Work90210/APIFold";

export function SelfHostSection() {
  return (
    <>
      {/* Deployment section */}
      <section className="relative border-t border-border px-6 py-28 md:py-36">

        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Deployment
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Host It Your Way
            </h2>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2">
            {/* Hosted Cloud */}
            <div className="rounded-lg border border-border p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border">
                  <Globe className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    Hosted Cloud
                  </h3>
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Recommended
                  </span>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Zero-config managed hosting. Deploy MCP servers without managing
                infrastructure. Join the waitlist to get early access.
              </p>
              <div className="mt-6">
                <a
                  href="mailto:hello@apifold.com"
                  className="inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-all duration-200 hover:bg-foreground/90 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  Join the Waitlist (Coming Soon)
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Self-Hosted */}
            <div className="rounded-lg border border-border p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border">
                  <Terminal className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    Self-Hosted
                  </h3>
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Available Now
                  </span>
                </div>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                Full-stack Docker Compose deployment. Your infrastructure, your
                data, your rules.
              </p>

              {/* Docker stack grid */}
              <div className="mb-6 grid grid-cols-3 gap-2">
                {(
                  ["NGINX", "NEXT.JS", "EXPRESS", "POSTGRES", "REDIS", "VAULT"] as const
                ).map((tech) => (
                  <div
                    key={tech}
                    className="rounded-lg border border-border px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    {tech}
                  </div>
                ))}
              </div>

              <a
                href={GITHUB_REPO}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-transparent px-5 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted/50 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Download className="h-4 w-4" />
                Get Docker Compose
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Open Source section */}
      <section className="relative border-t border-border px-6 py-28 md:py-36">
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Open Source
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                Built in the Open
              </h2>
              <p className="mt-4 max-w-lg leading-relaxed text-muted-foreground">
                Transparent, auditable, and community-driven. Every line of code
                is public.
              </p>

              <div className="mt-8 grid grid-cols-3 gap-4">
                {[
                  { value: "80%+", label: "Test Coverage" },
                  { value: "MIT + AGPL", label: "License" },
                  { value: "100%", label: "Source Available" },
                ].map(({ value, label }) => (
                  <div
                    key={label}
                    className="rounded-lg border border-border p-4 text-center"
                  >
                    <p className="text-2xl font-extrabold tabular-nums text-foreground">
                      {value}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href={GITHUB_REPO}
                  className="inline-flex items-center gap-2 rounded-md bg-foreground px-6 py-3 text-sm font-semibold text-background transition-all duration-300 hover:bg-foreground/90 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <Github className="h-4 w-4" />
                  Browse GitHub
                </a>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-transparent px-6 py-3 text-sm font-semibold text-foreground transition-all duration-300 hover:bg-muted/50 active:scale-[0.98]"
                >
                  <Users className="h-4 w-4" />
                  Join Discord
                </a>
              </div>
            </div>

            {/* Code snippet */}
            <div>
              <div className="rounded-lg border border-border bg-black p-6">
                <div className="mb-4 flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-3 font-mono text-[10px] text-muted-foreground/40">
                    bridge.ts
                  </span>
                </div>
                <pre className="overflow-x-auto font-mono text-sm leading-relaxed">
                  <code>
                    <span className="text-[#c678dd]">async function</span>{" "}
                    <span className="text-[#61afef]">bridgeToMcp</span>
                    <span className="text-[#abb2bf]">(</span>
                    <span className="text-[#e06c75]">spec</span>
                    <span className="text-[#abb2bf]">: </span>
                    <span className="text-[#e5c07b]">ApiSpec</span>
                    <span className="text-[#abb2bf]">) {"{"}</span>
                    {"\n"}
                    {"  "}
                    <span className="text-[#c678dd]">const</span>{" "}
                    <span className="text-[#e06c75]">tools</span>{" "}
                    <span className="text-[#abb2bf]">=</span>{" "}
                    <span className="text-[#c678dd]">await</span>{" "}
                    <span className="text-[#61afef]">transform</span>
                    <span className="text-[#abb2bf]">(</span>
                    <span className="text-[#e06c75]">spec</span>
                    <span className="text-[#abb2bf]">);</span>
                    {"\n"}
                    {"  "}
                    <span className="text-[#c678dd]">const</span>{" "}
                    <span className="text-[#e06c75]">server</span>{" "}
                    <span className="text-[#abb2bf]">=</span>{" "}
                    <span className="text-[#61afef]">createMcpServer</span>
                    <span className="text-[#abb2bf]">({"{"}</span>
                    {"\n"}
                    {"    "}
                    <span className="text-[#e06c75]">tools</span>
                    <span className="text-[#abb2bf]">,</span>
                    {"\n"}
                    {"    "}
                    <span className="text-[#e06c75]">transport</span>
                    <span className="text-[#abb2bf]">: </span>
                    <span className="text-[#98c379]">
                      &apos;sse&apos;
                    </span>
                    <span className="text-[#abb2bf]">,</span>
                    {"\n"}
                    {"    "}
                    <span className="text-[#e06c75]">auth</span>
                    <span className="text-[#abb2bf]">: </span>
                    <span className="text-[#98c379]">
                      &apos;bearer&apos;
                    </span>
                    <span className="text-[#abb2bf]">,</span>
                    {"\n"}
                    {"  "}
                    <span className="text-[#abb2bf]">{"}"});</span>
                    {"\n"}
                    {"  "}
                    <span className="text-[#c678dd]">return</span>{" "}
                    <span className="text-[#e06c75]">server</span>
                    <span className="text-[#abb2bf]">.</span>
                    <span className="text-[#61afef]">listen</span>
                    <span className="text-[#abb2bf]">(</span>
                    <span className="text-[#d19a66]">3002</span>
                    <span className="text-[#abb2bf]">);</span>
                    {"\n"}
                    <span className="text-[#abb2bf]">{"}"}</span>
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
