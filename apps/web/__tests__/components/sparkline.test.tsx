import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Sparkline } from "../../components/dashboard/sparkline";

describe("Sparkline", () => {
  const sampleData = [10, 20, 15, 30, 25] as const;

  it("renders an SVG element", () => {
    const { container } = render(<Sparkline data={sampleData} />);
    const svg = container.querySelector("svg");

    expect(svg).toBeInTheDocument();
  });

  it("renders a path element", () => {
    const { container } = render(<Sparkline data={sampleData} />);
    const path = container.querySelector("path");

    expect(path).toBeInTheDocument();
    expect(path).toHaveAttribute("d");
  });

  it("applies custom width and height", () => {
    const { container } = render(
      <Sparkline data={sampleData} width={120} height={48} />,
    );
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("width", "120");
    expect(svg).toHaveAttribute("height", "48");
    expect(svg).toHaveAttribute("viewBox", "0 0 120 48");
  });

  it("returns null when data has fewer than 2 points", () => {
    const { container } = render(<Sparkline data={[5]} />);

    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });

  it("uses default dimensions when none are provided", () => {
    const { container } = render(<Sparkline data={sampleData} />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("width", "80");
    expect(svg).toHaveAttribute("height", "32");
  });
});
