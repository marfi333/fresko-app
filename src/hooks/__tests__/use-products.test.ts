import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper } from "@/test/query-wrapper";
import { useProducts } from "../use-products";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe("useProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches products without search param", async () => {
    const products = [{ id: 1, name: "Milk", unit: "L", categoryId: 1, householdId: "hh-1" }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => products,
    });

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useProducts(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(products);
    expect(mockFetch).toHaveBeenCalledWith("/api/products");
  });

  it("fetches products with search param", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useProducts("mil"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith("/api/products?search=mil");
  });

  it("handles fetch errors", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useProducts(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
  });
});
