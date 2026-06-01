"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";

import { installSyncTriggers } from "@/lib/offline/query-bridge";

export const QueryProvider = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 'always' means queryFn runs even when offline. Our queryFns
            // catch fetch errors and fall back to the IDB mirror, so the UI
            // can render from cache when the network is down.
            networkMode: "always",
            staleTime: 60 * 1000,
            retry: 1,
          },
          mutations: {
            // 'always' means mutationFn runs even when offline. Without this,
            // RQ pauses mutations and `isPending` stays true forever, which
            // is what locked the buttons before. Our mutationFns enqueue to
            // the outbox when fetch throws, so offline writes still persist.
            networkMode: "always",
          },
        },
      })
  );

  useEffect(() => {
    return installSyncTriggers(queryClient);
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
