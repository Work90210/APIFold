import { create } from "zustand";

type ToastVariant = "default" | "success" | "destructive";

interface ToastItem {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly variant: ToastVariant;
}

interface ToastInput {
  readonly title: string;
  readonly description?: string;
  readonly variant?: ToastVariant;
}

interface ToastStore {
  readonly toasts: readonly ToastItem[];
  toast: (input: ToastInput) => void;
  dismiss: (id: string) => void;
}

const MAX_TOASTS = 5;
const AUTO_DISMISS_MS = 5_000;

let counter = 0;

function nextId(): string {
  counter += 1;
  return `toast-${counter}-${Date.now()}`;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  toast: (input) => {
    const id = nextId();
    const item: ToastItem = {
      id,
      title: input.title,
      description: input.description,
      variant: input.variant ?? "default",
    };

    set((state) => ({
      toasts: [...state.toasts.slice(-(MAX_TOASTS - 1)), item],
    }));

    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, AUTO_DISMISS_MS);
  },
  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
