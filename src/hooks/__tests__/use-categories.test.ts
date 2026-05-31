import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper } from "@/test/query-wrapper";
import { useCategories } from "../use-categories";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe("useCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches categories", async () => {
    const categories = [
      { id: 1, name: "Dairy", householdId: "hh-1" },
      { id: 2, name: "Fruits", householdId: "hh-1" },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => categories,
    });

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useCategories(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(categories);
    expect(mockFetch).toHaveBeenCalledWith("/api/categories");
  });

  it("handles fetch errors", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useCategories(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
  });
});
