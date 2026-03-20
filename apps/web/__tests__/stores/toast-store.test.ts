import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useToastStore } from "../../lib/stores/toast-store";

describe("useToastStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds a toast via toast()", () => {
    const { toast } = useToastStore.getState();
    toast({ title: "Hello" });

    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]!.title).toBe("Hello");
    expect(toasts[0]!.variant).toBe("default");
  });

  it("removes a toast via dismiss()", () => {
    const { toast } = useToastStore.getState();
    toast({ title: "Dismissable" });

    const { toasts: before } = useToastStore.getState();
    expect(before).toHaveLength(1);

    const id = before[0]!.id;
    const { dismiss } = useToastStore.getState();
    dismiss(id);

    const { toasts: after } = useToastStore.getState();
    expect(after).toHaveLength(0);
  });

  it("enforces a maximum of 5 toasts", () => {
    const { toast } = useToastStore.getState();

    for (let i = 0; i < 7; i++) {
      toast({ title: `Toast ${i}` });
    }

    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(5);
    expect(toasts[0]!.title).toBe("Toast 2");
    expect(toasts[4]!.title).toBe("Toast 6");
  });

  it("assigns the specified variant", () => {
    const { toast } = useToastStore.getState();
    toast({ title: "Error!", variant: "destructive" });

    const { toasts } = useToastStore.getState();
    expect(toasts[0]!.variant).toBe("destructive");
  });

  it("auto-dismisses a toast after the timeout", () => {
    const { toast } = useToastStore.getState();
    toast({ title: "Temporary" });

    expect(useToastStore.getState().toasts).toHaveLength(1);

    vi.advanceTimersByTime(5_000);

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
