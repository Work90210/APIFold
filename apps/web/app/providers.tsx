"use client";

import { useState, type ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider, ToastViewport } from "@apifold/ui";
import { Toaster } from "@/components/layout/toaster";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function Providers({ children }: { readonly children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <ClerkProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {children}
          <Toaster />
          <ToastViewport />
        </ToastProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
