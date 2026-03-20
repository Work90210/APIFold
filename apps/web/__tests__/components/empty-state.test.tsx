import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { EmptyState } from "@apifold/ui";
import { Server } from "lucide-react";

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState title="No items found" />);

    expect(screen.getByText("No items found")).toBeInTheDocument();
  });

  it("renders the description when provided", () => {
    render(
      <EmptyState
        title="No items found"
        description="Try adjusting your filters."
      />,
    );

    expect(screen.getByText("Try adjusting your filters.")).toBeInTheDocument();
  });

  it("renders an action when provided", () => {
    render(
      <EmptyState
        title="No servers"
        action={<button type="button">Add server</button>}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Add server" }),
    ).toBeInTheDocument();
  });

  it("renders the icon when provided", () => {
    const { container } = render(
      <EmptyState title="No servers" icon={Server} />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("does not render description or action when omitted", () => {
    const { container } = render(<EmptyState title="Empty" />);

    expect(container.querySelector("p")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });
});
