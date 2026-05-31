import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryWrapper } from "@/test/query-wrapper";
import {
  useCreateEntry,
  useDecreaseQuantity,
  useDeleteAllProductEntries,
  useDeleteEntry,
  useMarkAsWasted,
  useUpdateEntry,
} from "../use-entry-mutations";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe("useCreateEntry", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("creates an entry and invalidates queries", async () => {
    const entry = { id: 1, productId: 1, quantity: 2, compartment: "fridge" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => entry,
    });

    const { wrapper, queryClient } = createQueryWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreateEntry(), { wrapper });

    await act(async () => {
      result.current.mutate({
        productId: 1,
        quantity: 2,
        compartment: "fridge",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: 1, quantity: 2, compartment: "fridge" }),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["entries"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products"] });
  });

  it("throws on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "productId, quantity, and compartment are required" }),
    });

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useCreateEntry(), { wrapper });

    await act(async () => {
      result.current.mutate({
        productId: 0,
        quantity: 0,
        compartment: "fridge",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("required");
  });
});

describe("useUpdateEntry", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("updates an entry", async () => {
    const updated = { id: 1, productId: 1, quantity: 5, compartment: "fridge" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => updated,
    });

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useUpdateEntry(), { wrapper });

    await act(async () => {
      result.current.mutate({ id: 1, quantity: 5 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith("/api/entries/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: 5 }),
    });
  });
});

describe("useDeleteEntry", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("deletes an entry and invalidates queries", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { wrapper, queryClient } = createQueryWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteEntry(), { wrapper });

    await act(async () => {
      result.current.mutate(5);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith("/api/entries/5", {
      method: "DELETE",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["entries"] });
  });
});

describe("useDecreaseQuantity", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("decreases quantity via FEFO", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ decreasedTotal: 3 }),
    });

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useDecreaseQuantity(), { wrapper });

    await act(async () => {
      result.current.mutate({ productId: 1, amount: 3 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith("/api/entries/decrease", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: 1, amount: 3 }),
    });
    expect(result.current.data).toEqual({ decreasedTotal: 3 });
  });

  it("handles error when amount exceeds available", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Amount exceeds available quantity" }),
    });

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useDecreaseQuantity(), { wrapper });

    await act(async () => {
      result.current.mutate({ productId: 1, amount: 999 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("exceeds");
  });
});

describe("useDeleteAllProductEntries", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("DELETEs each entry id in parallel and invalidates entries+products", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { wrapper, queryClient } = createQueryWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteAllProductEntries(), { wrapper });

    await act(async () => {
      result.current.mutate([10, 11, 12]);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenCalledWith("/api/entries/10", { method: "DELETE" });
    expect(mockFetch).toHaveBeenCalledWith("/api/entries/11", { method: "DELETE" });
    expect(mockFetch).toHaveBeenCalledWith("/api/entries/12", { method: "DELETE" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["entries"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products"] });
  });

  it("rejects when any DELETE fails", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "boom" }) });

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useDeleteAllProductEntries(), { wrapper });

    await act(async () => {
      result.current.mutate([1, 2]);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("boom");
  });
});

describe("useMarkAsWasted", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("marks entry as wasted (deletes it)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { wrapper, queryClient } = createQueryWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useMarkAsWasted(), { wrapper });

    await act(async () => {
      result.current.mutate({ id: 10 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith("/api/entries/10", {
      method: "DELETE",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["entries"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products"] });
  });
});
