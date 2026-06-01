"use client";

import { useEffect, useState } from "react";

import { outbox, subscribeOutbox } from "@/lib/offline/db";
import type { OutboxRecord } from "@/lib/offline/types";

export const usePendingItems = (): OutboxRecord[] => {
  const [items, setItems] = useState<OutboxRecord[]>([]);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const all = await outbox.peekAll();
        if (!cancelled) setItems(all);
      } catch {
        if (!cancelled) setItems([]);
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

  return items;
};
