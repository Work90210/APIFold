"use client";

import { useToastStore } from "@/lib/stores/toast-store";
import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
} from "@apifold/ui";

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <>
      {toasts.map((item) => (
        <Toast
          key={item.id}
          variant={item.variant}
          onOpenChange={(open) => {
            if (!open) {
              dismiss(item.id);
            }
          }}
        >
          <div className="grid gap-1">
            <ToastTitle>{item.title}</ToastTitle>
            {item.description && (
              <ToastDescription>{item.description}</ToastDescription>
            )}
          </div>
          <ToastClose />
        </Toast>
      ))}
    </>
  );
}
