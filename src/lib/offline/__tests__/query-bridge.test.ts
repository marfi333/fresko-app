import "fake-indexeddb/auto";

import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { closeMirrorDb, resetMirrorDbForTests } from "../db";
import { enqueueMutation } from "../outbox";
import { drainAndInvalidate, installSyncTriggers, QUERY_KEYS } from "../query-bridge";
import { SYNC_MESSAGE } from "../sync-tag";

const fetchMock = vi.fn();

beforeEach(async () => {
  await resetMirrorDbForTests();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(async () => {
  await closeMirrorDb();
  vi.unstubAllGlobals();
});

const replayResponse = (
  results: Array<{ id: string; status: "ok" | "skipped" | "gone" | "error"; reason?: string }>
) =>
  Promise.resolve(
    new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );

describe("drainAndInvalidate", () => {
  it("invalidates affected query keys on a non-empty successful drain", async () => {
    const a = await enqueueMutation({ entity: "entries", op: "create", payload: {} });
    fetchMock.mockReturnValueOnce(replayResponse([{ id: a.id, status: "ok" }]));

    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    const result = await drainAndInvalidate(queryClient);
    expect(result.ok).toBe(1);

    const calls = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(calls).toEqual(
      expect.arrayContaining([
        QUERY_KEYS.entries,
        QUERY_KEYS.categories,
        QUERY_KEYS.shopping,
        QUERY_KEYS.shoppingSuggestions,
      ])
    );
  });

  it("does not invalidate when the outbox is empty", async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    const result = await drainAndInvalidate(queryClient);
    expect(result.drained).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it("does not invalidate when only network errors occur", async () => {
    await enqueueMutation({ entity: "entries", op: "create", payload: {} });
    fetchMock.mockImplementationOnce(() => Promise.reject(new TypeError("Failed to fetch")));

    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    const result = await drainAndInvalidate(queryClient);
    expect(result.networkError).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("installSyncTriggers", () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => true,
    });
  });

  it("attaches online + focus listeners and detaches on unmount", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const queryClient = new QueryClient();

    const unmount = installSyncTriggers(queryClient);
    const added = addSpy.mock.calls.map(([name]) => name);
    expect(added).toContain("online");
    expect(added).toContain("focus");

    unmount();
    const removed = removeSpy.mock.calls.map(([name]) => name);
    expect(removed).toContain("online");
    expect(removed).toContain("focus");
  });

  it("drains the outbox on `online` event", async () => {
    const a = await enqueueMutation({ entity: "entries", op: "create", payload: {} });
    fetchMock.mockReturnValue(replayResponse([{ id: a.id, status: "ok" }]));

    const queryClient = new QueryClient();
    const unmount = installSyncTriggers(queryClient);

    // The "install once if online" path will fire immediately. Wait a tick.
    await new Promise((r) => setTimeout(r, 5));
    expect(fetchMock).toHaveBeenCalled();

    unmount();
  });

  it("drains on SYNC_MESSAGE from the service worker", async () => {
    const a = await enqueueMutation({ entity: "entries", op: "create", payload: {} });
    fetchMock.mockReturnValue(replayResponse([{ id: a.id, status: "ok" }]));

    // Stub serviceWorker on navigator.
    const listeners = new Set<(event: MessageEvent) => void>();
    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      get: () => ({
        addEventListener: (_type: string, listener: (event: MessageEvent) => void) =>
          listeners.add(listener),
        removeEventListener: (_type: string, listener: (event: MessageEvent) => void) =>
          listeners.delete(listener),
      }),
    });

    const queryClient = new QueryClient();
    const unmount = installSyncTriggers(queryClient);

    fetchMock.mockClear();
    // Fire a fake SW message.
    listeners.forEach((l) => {
      l(new MessageEvent("message", { data: { type: SYNC_MESSAGE } }));
    });
    await new Promise((r) => setTimeout(r, 5));
    expect(fetchMock).toHaveBeenCalled();

    unmount();

    // @ts-expect-error - reset stubbed property
    delete window.navigator.serviceWorker;
  });
});
