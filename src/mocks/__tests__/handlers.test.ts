import { renderHook, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { useCategories } from "@/hooks/use-categories";
import { useEntries } from "@/hooks/use-entries";
import { useProductHints } from "@/hooks/use-product-hints";
import { useProducts } from "@/hooks/use-products";
import { createQueryWrapper } from "@/test/query-wrapper";
import { mockCategories, mockEntries, mockProductHints, mockProducts } from "../handlers";
import { server } from "../server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("MSW handlers integration", () => {
  it("serves products via MSW", async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useProducts(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(mockProducts.length);
    expect(result.current.data?.[0].name).toBe("Whole Milk");
  });

  it("serves filtered products via MSW", async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useProducts("Chicken"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe("Chicken Breast");
  });

  it("serves entries via MSW", async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useEntries(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(mockEntries.length);
  });

  it("serves entries filtered by compartment", async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useEntries({ compartment: "fridge" }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].compartment).toBe("fridge");
  });

  it("serves categories via MSW", async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useCategories(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(mockCategories.length);
  });

  it("serves product hints via MSW", async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useProductHints("milk"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]).toMatchObject(mockProductHints[0]);
  });
});
