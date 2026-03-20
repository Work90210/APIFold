import { useToastStore } from "@/lib/stores/toast-store";

export function useToast() {
  const toast = useToastStore((state) => state.toast);
  const dismiss = useToastStore((state) => state.dismiss);
  return { toast, dismiss };
}
