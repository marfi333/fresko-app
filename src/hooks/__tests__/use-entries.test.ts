import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useEntries } from "../use-entries";
import { createQueryWrapper } from "@/test/query-wrapper";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe("useEntries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches all entries without filters", async () => {
    const entries = [
      { id: 1, productId: 1, quantity: 3, compartment: "fridge", householdId: "hh-1" },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => entries,
    });

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useEntries(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(entries);
    expect(mockFetch).toHaveBeenCalledWith("/api/entries");
  });

  it("fetches entries filtered by compartment", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => useEntries({ compartment: "fridge" }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith("/api/entries?compartment=fridge");
  });

  it("fetches entries filtered by categoryId", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => useEntries({ categoryId: 5 }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith("/api/entries?categoryId=5");
  });

  it("fetches entries with both filters", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => useEntries({ compartment: "pantry", categoryId: 2 }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/entries?compartment=pantry&categoryId=2"
    );
  });

  it("handles fetch errors", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useEntries(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
  });
});
