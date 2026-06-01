import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useOnline } from "../use-online";

const setNavigatorOnLine = (value: boolean) => {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => value,
  });
};

const fireConnectivityEvent = (name: "online" | "offline") => {
  window.dispatchEvent(new Event(name));
};

describe("useOnline", () => {
  beforeEach(() => {
    setNavigatorOnLine(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns navigator.onLine on mount", () => {
    setNavigatorOnLine(false);
    const { result } = renderHook(() => useOnline());
    expect(result.current.online).toBe(false);
  });

  it("flips to false when an offline event fires", () => {
    const { result } = renderHook(() => useOnline());
    expect(result.current.online).toBe(true);

    act(() => {
      setNavigatorOnLine(false);
      fireConnectivityEvent("offline");
    });

    expect(result.current.online).toBe(false);
  });

  it("flips back to true when an online event fires", () => {
    setNavigatorOnLine(false);
    const { result } = renderHook(() => useOnline());
    expect(result.current.online).toBe(false);

    act(() => {
      setNavigatorOnLine(true);
      fireConnectivityEvent("online");
    });

    expect(result.current.online).toBe(true);
  });

  it("updates `since` timestamp whenever online state changes", () => {
    const { result } = renderHook(() => useOnline());
    const initialSince = result.current.since;
    expect(typeof initialSince).toBe("number");

    act(() => {
      setNavigatorOnLine(false);
      fireConnectivityEvent("offline");
    });

    expect(result.current.since).toBeGreaterThanOrEqual(initialSince);
    expect(result.current.online).toBe(false);
  });

  it("removes its event listeners on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useOnline());
    unmount();
    const removed = removeSpy.mock.calls.map(([name]) => name);
    expect(removed).toContain("online");
    expect(removed).toContain("offline");
  });
});
