import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/query-wrapper";
import { useBarcodeLookup } from "../use-barcode-lookup";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const CODE = "5901234123457";

describe("useBarcodeLookup", () => {
  it("resolves to kind: 'existing' when /api/products/by-barcode finds a household product", async () => {
    server.use(
      http.get("/api/products/by-barcode", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("code")).toBe(CODE);
        return HttpResponse.json({
          id: 7,
          name: "Whole Milk",
          unit: "L",
          categoryId: 1,
          householdId: "hh-1",
          barcode: CODE,
          createdAt: "2026-05-01T00:00:00.000Z",
        });
      })
    );

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useBarcodeLookup(), { wrapper });

    result.current.mutate(CODE);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      kind: "existing",
      barcode: CODE,
      product: expect.objectContaining({ id: 7, name: "Whole Milk" }),
    });
  });

  it("resolves to kind: 'new-from-off' when local 404 + OFF returns a hit", async () => {
    server.use(
      http.get("/api/products/by-barcode", () =>
        HttpResponse.json({ error: "Not found" }, { status: 404 })
      ),
      http.get("/api/barcode-lookup/:code", ({ params }) => {
        expect(params.code).toBe(CODE);
        return HttpResponse.json({
          name: "Acme Whole Milk 2L",
          brands: "Acme",
          categoriesTags: ["en:dairy", "en:milk"],
          quantity: "2L",
        });
      })
    );

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useBarcodeLookup(), { wrapper });

    result.current.mutate(CODE);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      kind: "new-from-off",
      barcode: CODE,
      name: "Acme Whole Milk 2L",
    });
  });

  it("resolves to kind: 'new-blank' when local 404 + OFF returns 404", async () => {
    server.use(
      http.get("/api/products/by-barcode", () =>
        HttpResponse.json({ error: "Not found" }, { status: 404 })
      ),
      http.get("/api/barcode-lookup/:code", () =>
        HttpResponse.json({ error: "Not found" }, { status: 404 })
      )
    );

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useBarcodeLookup(), { wrapper });

    result.current.mutate(CODE);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ kind: "new-blank", barcode: CODE });
  });

  it("resolves to kind: 'error' when the OFF lookup returns 5xx / 504", async () => {
    server.use(
      http.get("/api/products/by-barcode", () =>
        HttpResponse.json({ error: "Not found" }, { status: 404 })
      ),
      http.get("/api/barcode-lookup/:code", () =>
        HttpResponse.json({ error: "Upstream error" }, { status: 502 })
      )
    );

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useBarcodeLookup(), { wrapper });

    result.current.mutate(CODE);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ kind: "error", barcode: CODE });
  });

  it("resolves to kind: 'error' when /api/products/by-barcode itself fails (non-404)", async () => {
    server.use(
      http.get("/api/products/by-barcode", () =>
        HttpResponse.json({ error: "Internal" }, { status: 500 })
      )
    );

    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useBarcodeLookup(), { wrapper });

    result.current.mutate(CODE);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ kind: "error", barcode: CODE });
  });
});
