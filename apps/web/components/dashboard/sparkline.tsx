function buildPath(data: readonly number[], width: number, height: number): string {
  if (data.length < 2) return "";

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const padding = 2;
  const drawHeight = height - padding * 2;
  const stepX = width / (data.length - 1);

  const points = data.map((value, index) => ({
    x: index * stepX,
    y: padding + drawHeight - ((value - min) / range) * drawHeight,
  }));

  const segments = points.map((point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;

    const prev = points[index - 1]!;
    const cpX = (prev.x + point.x) / 2;

    return `C ${cpX} ${prev.y}, ${cpX} ${point.y}, ${point.x} ${point.y}`;
  });

  return segments.join(" ");
}

export function Sparkline({
  data,
  color = "currentColor",
  width = 80,
  height = 32,
}: {
  readonly data: readonly number[];
  readonly color?: string;
  readonly width?: number;
  readonly height?: number;
}) {
  const path = buildPath(data, width, height);

  if (!path) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className="overflow-visible"
      aria-hidden="true"
    >
      <path
        d={path}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
