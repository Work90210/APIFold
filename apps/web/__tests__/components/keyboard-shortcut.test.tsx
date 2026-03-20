import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { KeyboardShortcut } from "../../components/layout/keyboard-shortcut";

describe("KeyboardShortcut", () => {
  it("renders the keys text", () => {
    render(<KeyboardShortcut keys="Ctrl+K" />);

    expect(screen.getByText("Ctrl+K")).toBeInTheDocument();
  });

  it("renders a kbd element", () => {
    const { container } = render(<KeyboardShortcut keys="Cmd+S" />);
    const kbd = container.querySelector("kbd");

    expect(kbd).toBeInTheDocument();
    expect(kbd).toHaveTextContent("Cmd+S");
  });

  it("applies the expected styling classes", () => {
    const { container } = render(<KeyboardShortcut keys="Esc" />);
    const kbd = container.querySelector("kbd");

    expect(kbd).toHaveClass("font-mono", "text-xs");
  });
});
