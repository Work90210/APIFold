"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";

export function SettingsHeader() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (!checkout) return;

    if (checkout === "success") {
      toast({
        title: "Plan upgraded",
        description: "Your new plan is now active. Welcome aboard!",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["usage"] });
    } else if (checkout === "cancelled") {
      toast({
        title: "Checkout cancelled",
        description: "No changes were made to your plan.",
      });
    }

    router.replace("/dashboard/settings");
  }, [searchParams, router, toast, queryClient]);

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">
        Settings
      </h1>
    </div>
  );
}
