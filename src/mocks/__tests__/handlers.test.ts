import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { server } from "../server";
import { useProducts } from "@/hooks/use-products";
import { useEntries } from "@/hooks/use-entries";
import { useCategories } from "@/hooks/use-categories";
import { useProductHints } from "@/hooks/use-product-hints";
import { createQueryWrapper } from "@/test/query-wrapper";
import { mockProducts, mockEntries, mockCategories, mockProductHints } from "../handlers";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("MSW handlers integration", () => {
  it("serves products via MSW", async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useProducts(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(mockProducts.length);
    expect(result.current.data![0].name).toBe("Whole Milk");
  });

  it("serves filtered products via MSW", async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useProducts("Chicken"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].name).toBe("Chicken Breast");
  });

  it("serves entries via MSW", async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useEntries(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(mockEntries.length);
  });

  it("serves entries filtered by compartment", async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => useEntries({ compartment: "fridge" }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].compartment).toBe("fridge");
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
    expect(result.current.data![0]).toMatchObject(mockProductHints[0]);
  });
});
