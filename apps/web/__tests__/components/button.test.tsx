import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Button } from "@apifold/ui";

describe("Button", () => {
  it("renders with default variant", () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toBeInTheDocument();
  });

  it("applies disabled state", () => {
    render(<Button disabled>Disabled</Button>);

    const button = screen.getByRole("button", { name: "Disabled" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:opacity-50");
  });

  it("fires onClick handler", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Press</Button>);

    await user.click(screen.getByRole("button", { name: "Press" }));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("does not fire onClick when disabled", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <Button disabled onClick={handleClick}>
        No click
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "No click" }));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders a different element when asChild is used", () => {
    render(
      <Button asChild>
        <a href="/home">Home</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Home" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/home");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
