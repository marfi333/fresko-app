"use client";

import type { QueryClient } from "@tanstack/react-query";

import { type DrainResult, drainOutbox } from "./sync-runner";
import { SYNC_MESSAGE } from "./sync-tag";

/**
 * Query keys that are invalidated after a successful sync drain. Hooks should
 * use these constants when registering their own queries so the bridge can
 * invalidate them centrally.
 */
export const QUERY_KEYS = {
  entries: ["entries"] as const,
  categories: ["categories"] as const,
  shopping: ["shopping"] as const,
  shoppingSuggestions: ["shopping", "suggestions"] as const,
};

const isAffected = (result: DrainResult): boolean =>
  result.ok > 0 || result.gone > 0 || result.skipped > 0;

const invalidateAfterDrain = (queryClient: QueryClient, result: DrainResult) => {
  if (!isAffected(result)) return;
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.entries });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shopping });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shoppingSuggestions });
};

export const drainAndInvalidate = async (queryClient: QueryClient): Promise<DrainResult> => {
  const result = await drainOutbox();
  invalidateAfterDrain(queryClient, result);
  return result;
};

/**
 * Installs reconnect/focus/SW-message triggers that drain the outbox and
 * invalidate affected queries. Returns an unmount function that removes all
 * listeners.
 *
 * Idempotent — safe to call from a `useEffect` that mounts once at app shell.
 */
export const installSyncTriggers = (queryClient: QueryClient): (() => void) => {
  if (typeof window === "undefined") return () => {};

  const run = () => {
    void drainAndInvalidate(queryClient);
  };

  const onOnline = () => run();
  const onFocus = () => {
    if (navigator.onLine) run();
  };
  const onMessage = (event: MessageEvent) => {
    if (event.data?.type === SYNC_MESSAGE) run();
  };

  window.addEventListener("online", onOnline);
  window.addEventListener("focus", onFocus);
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", onMessage);
  }

  // Try once on install if we're already online and have queued work.
  if (navigator.onLine) run();

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("focus", onFocus);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    }
  };
};
