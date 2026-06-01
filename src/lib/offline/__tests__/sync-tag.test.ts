import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requestBackgroundSync, SYNC_TAG } from "../sync-tag";

const setNavigator = (sw: unknown) => {
  Object.defineProperty(window, "navigator", {
    configurable: true,
    value: sw,
  });
};

const originalNavigator = window.navigator;

beforeEach(() => {
  setNavigator({ serviceWorker: undefined });
});

afterEach(() => {
  setNavigator(originalNavigator);
});

describe("requestBackgroundSync", () => {
  it("returns false when serviceWorker is unavailable", async () => {
    setNavigator({});
    expect(await requestBackgroundSync()).toBe(false);
  });

  it("returns false when SyncManager is unavailable on the registration (Safari path)", async () => {
    setNavigator({
      serviceWorker: {
        ready: Promise.resolve({}),
      },
    });
    expect(await requestBackgroundSync()).toBe(false);
  });

  it("registers the SYNC_TAG and returns true when SyncManager exists", async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    setNavigator({
      serviceWorker: {
        ready: Promise.resolve({ sync: { register } }),
      },
    });

    const result = await requestBackgroundSync();
    expect(result).toBe(true);
    expect(register).toHaveBeenCalledWith(SYNC_TAG);
  });

  it("returns false on registration error", async () => {
    setNavigator({
      serviceWorker: {
        ready: Promise.resolve({
          sync: { register: () => Promise.reject(new Error("denied")) },
        }),
      },
    });
    expect(await requestBackgroundSync()).toBe(false);
  });
});
