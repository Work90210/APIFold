import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "@apifold/ui";

describe("Badge", () => {
  it("renders with default variant", () => {
    render(<Badge>Default</Badge>);

    const badge = screen.getByText("Default");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-primary");
  });

  it("renders success variant with correct classes", () => {
    render(<Badge variant="success">Active</Badge>);

    const badge = screen.getByText("Active");
    expect(badge).toHaveClass("bg-status-success-muted");
    expect(badge).toHaveClass("text-status-success");
  });

  it("renders error variant with correct classes", () => {
    render(<Badge variant="error">Failed</Badge>);

    const badge = screen.getByText("Failed");
    expect(badge).toHaveClass("bg-status-error-muted");
    expect(badge).toHaveClass("text-status-error");
  });

  it("applies additional className", () => {
    render(<Badge className="mt-2">Styled</Badge>);

    const badge = screen.getByText("Styled");
    expect(badge).toHaveClass("mt-2");
  });

  it("renders destructive variant with correct classes", () => {
    render(<Badge variant="destructive">Danger</Badge>);

    const badge = screen.getByText("Danger");
    expect(badge).toHaveClass("bg-destructive");
  });
});
