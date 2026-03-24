"use client";

import { ToastProvider, ToastViewport } from "@apifold/ui";
import { ClerkProvider } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { PostHogProvider } from "@/components/analytics/posthog-provider";
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
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: 'hsl(217, 91%, 60%)',
          colorBackground: 'hsl(0, 0%, 100%)',
          colorText: 'hsl(0, 0%, 9%)',
          colorInputBackground: 'transparent',
          colorInputText: 'hsl(0, 0%, 9%)',
          borderRadius: '0.375rem',
          fontFamily: 'var(--font-sans)',
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <PostHogProvider>
            {children}
          </PostHogProvider>
          <Toaster />
          <ToastViewport />
        </ToastProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
