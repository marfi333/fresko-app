"use client";

import { useEffect, useState } from "react";

import { outbox, subscribeOutbox } from "@/lib/offline/db";

export type PendingState = {
  count: number;
  failed: number;
};

const initial: PendingState = { count: 0, failed: 0 };

export const usePendingCount = (): PendingState => {
  const [state, setState] = useState<PendingState>(initial);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const all = await outbox.peekAll();
        if (cancelled) return;
        setState({
          count: all.length,
          failed: all.filter((r) => r.status === "failed").length,
        });
      } catch {
        if (!cancelled) setState(initial);
      }
    };

    void refresh();
    const unsubscribe = subscribeOutbox(() => {
      void refresh();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return state;
};
