"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { ToastProvider } from "@/lib/hooks/useToast";
import { ModalsProvider } from "@/lib/hooks/useModals";
import { CompareProvider } from "@/lib/hooks/useCompare";
import { Toaster } from "@/components/shell/Toaster";

/** Global client providers: React Query, theme (dark default), toast, modals, compare. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        value={{ dark: "th-dark", light: "th-light" }}
      >
        <ToastProvider>
          <ModalsProvider>
            <CompareProvider>
              {children}
              <Toaster />
            </CompareProvider>
          </ModalsProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
