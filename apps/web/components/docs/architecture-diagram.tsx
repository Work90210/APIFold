"use client";

interface NodeConfig {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly label: string;
  readonly sub: string;
  readonly color: string;
}

const NODES: Record<string, NodeConfig> = {
  claude:   { x: 140, y: 30,  w: 130, h: 50, label: "Claude",        sub: "AI Client",               color: "#3b82f6" },
  cursor:   { x: 410, y: 30,  w: 130, h: 50, label: "Cursor",        sub: "AI Client",               color: "#3b82f6" },
  nginx:    { x: 210, y: 150, w: 260, h: 50, label: "Nginx",         sub: "Reverse Proxy + TLS",      color: "#8b5cf6" },
  web:      { x: 100, y: 270, w: 190, h: 54, label: "Web App",       sub: "Next.js · Dashboard",      color: "#10b981" },
  runtime:  { x: 390, y: 270, w: 190, h: 54, label: "MCP Runtime",   sub: "Express · SSE · JSON-RPC", color: "#f59e0b" },
  postgres: { x: 130, y: 400, w: 150, h: 50, label: "PostgreSQL",    sub: "Source of Truth",          color: "#6366f1" },
  redis:    { x: 400, y: 400, w: 150, h: 50, label: "Redis",         sub: "Pub/Sub · Cache",          color: "#6366f1" },
  upstream: { x: 620, y: 270, w: 120, h: 54, label: "Upstream",      sub: "REST API",                 color: "#ef4444" },
};

interface EdgeConfig {
  readonly from: string;
  readonly to: string;
  readonly label: string;
  readonly dashed?: boolean;
  readonly labelOffset?: { dx: number; dy: number };
}

const EDGES: readonly EdgeConfig[] = [
  { from: "claude",  to: "nginx",    label: "HTTPS" },
  { from: "cursor",  to: "nginx",    label: "SSE" },
  { from: "nginx",   to: "web",      label: "/dashboard",    labelOffset: { dx: -14, dy: 0 } },
  { from: "nginx",   to: "runtime",  label: "/mcp/*",        labelOffset: { dx: 14, dy: 0 } },
  { from: "web",     to: "postgres", label: "Drizzle ORM",   labelOffset: { dx: -10, dy: 0 } },
  { from: "web",     to: "redis",    label: "Pub/Sub",       dashed: true, labelOffset: { dx: -30, dy: -8 } },
  { from: "runtime", to: "postgres", label: "Config",        dashed: true, labelOffset: { dx: 30, dy: -8 } },
  { from: "runtime", to: "redis",    label: "Sync",          labelOffset: { dx: 10, dy: 0 } },
  { from: "runtime", to: "upstream", label: "Proxy" },
];

function NodeBox({ node }: { readonly node: NodeConfig }) {
  return (
    <g>
      <rect
        x={node.x}
        y={node.y}
        width={node.w}
        height={node.h}
        rx={10}
        fill={node.color}
        opacity={0.92}
      />
      <text
        x={node.x + node.w / 2}
        y={node.y + node.h / 2 - 7}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize={14}
        fontWeight={700}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {node.label}
      </text>
      <text
        x={node.x + node.w / 2}
        y={node.y + node.h / 2 + 11}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff"
        fontSize={10}
        opacity={0.75}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {node.sub}
      </text>
    </g>
  );
}

function getAnchor(node: NodeConfig, target: NodeConfig): { x: number; y: number } {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const tx = target.x + target.w / 2;
  const ty = target.y + target.h / 2;

  const dx = tx - cx;
  const dy = ty - cy;

  if (Math.abs(dy) > Math.abs(dx)) {
    return dy > 0
      ? { x: cx, y: node.y + node.h }
      : { x: cx, y: node.y };
  }
  return dx > 0
    ? { x: node.x + node.w, y: cy }
    : { x: node.x, y: cy };
}

function Edge({ edge }: { readonly edge: EdgeConfig }) {
  const from = NODES[edge.from];
  const to = NODES[edge.to];
  if (!from || !to) return null;

  const start = getAnchor(from, to);
  const end = getAnchor(to, from);

  const midX = (start.x + end.x) / 2 + (edge.labelOffset?.dx ?? 0);
  const midY = (start.y + end.y) / 2 + (edge.labelOffset?.dy ?? 0);

  return (
    <g>
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke="#64748b"
        strokeWidth={1.5}
        strokeDasharray={edge.dashed ? "6 3" : undefined}
        markerEnd="url(#arrow)"
      />
      <rect
        x={midX - edge.label.length * 3.5 - 4}
        y={midY - 16}
        width={edge.label.length * 7 + 8}
        height={16}
        rx={4}
        fill="var(--background, #0a0a0a)"
        opacity={0.85}
      />
      <text
        x={midX}
        y={midY - 7}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#94a3b8"
        fontSize={10}
        fontWeight={500}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {edge.label}
      </text>
    </g>
  );
}

export function ArchitectureDiagram() {
  return (
    <figure className="my-8 flex justify-center">
      <svg
        viewBox="0 0 780 480"
        className="w-full max-w-3xl"
        role="img"
        aria-label="ApiFold architecture diagram showing AI clients connecting through nginx to the web app and MCP runtime, backed by PostgreSQL and Redis"
      >
        <defs>
          <marker
            id="arrow"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
          </marker>
        </defs>

        {EDGES.map((edge) => (
          <Edge key={`${edge.from}-${edge.to}`} edge={edge} />
        ))}

        {Object.values(NODES).map((node) => (
          <NodeBox key={node.label} node={node} />
        ))}
      </svg>
    </figure>
  );
}
