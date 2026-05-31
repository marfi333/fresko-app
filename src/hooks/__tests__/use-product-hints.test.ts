import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper } from "@/test/query-wrapper";
import { useProductHints } from "../use-product-hints";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe("useProductHints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches hints when name is at least 2 characters", async () => {
    const hints = [{ id: 1, namePattern: "milk", suggestedUnit: "L", suggestedCategory: "Dairy" }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => hints,
    });

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useProductHints("mi"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(hints);
    expect(mockFetch).toHaveBeenCalledWith("/api/product-hints?name=mi");
  });

  it("does not fetch when name is less than 2 characters", () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useProductHints("m"), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not fetch when name is empty", () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useProductHints(""), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("handles fetch errors", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useProductHints("milk"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
  });
});
