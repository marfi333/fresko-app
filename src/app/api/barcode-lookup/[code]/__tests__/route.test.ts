import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetRequestContext = vi.fn();
const mockReadCache = vi.fn();
const mockWriteCacheHit = vi.fn();
const mockWriteCacheMiss = vi.fn();

vi.mock("@/lib/api-utils", () => ({
  getRequestContext: (...args: unknown[]) => mockGetRequestContext(...args),
}));

vi.mock("@/lib/barcode/cache", () => ({
  readCache: (...args: unknown[]) => mockReadCache(...args),
  writeCacheHit: (...args: unknown[]) => mockWriteCacheHit(...args),
  writeCacheMiss: (...args: unknown[]) => mockWriteCacheMiss(...args),
}));

import { GET } from "../route";

const params = (code: string) => ({ params: Promise.resolve({ code }) });
const CODE = "5901234123457";

type FetchHandler = (url: string) => Response | Promise<Response>;
type FetchHandlers = { off?: FetchHandler; upc?: FetchHandler };

const installFetchRouter = (handlers: FetchHandlers) => {
  return vi.spyOn(global, "fetch").mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("openfoodfacts.org")) {
      if (!handlers.off) return Promise.reject(new Error("unexpected OFF call"));
      return Promise.resolve(handlers.off(url));
    }
    if (url.includes("upcitemdb.com")) {
      if (!handlers.upc) return Promise.reject(new Error("unexpected UPCitemdb call"));
      return Promise.resolve(handlers.upc(url));
    }
    return Promise.reject(new Error(`unrouted fetch: ${url}`));
  });
};

const offHit = (overrides: Record<string, unknown> = {}) =>
  new Response(
    JSON.stringify({
      status: 1,
      product: {
        product_name: "Whole Milk 2L",
        brands: "Acme",
        categories_tags: ["en:dairy", "en:milk"],
        quantity: "2L",
        ...overrides,
      },
    }),
    { status: 200 }
  );

const offMissBody = () => new Response(JSON.stringify({ status: 0 }), { status: 200 });

const upcHit = (title = "Coca-Cola Original 0.5L") =>
  new Response(
    JSON.stringify({
      code: "OK",
      items: [{ title, brand: "Coca-Cola", category: "Beverages", size: "0.5L" }],
    }),
    { status: 200 }
  );

const upcMissBody = () =>
  new Response(JSON.stringify({ code: "NO_MATCH", items: [] }), { status: 200 });

describe("GET /api/barcode-lookup/[code]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRequestContext.mockResolvedValue({
      db: {},
      session: { user: { id: "user-1" }, session: { id: "s-1" } },
      householdId: "hh-1",
      userId: "user-1",
    });
    // Default: cold cache → external lookup proceeds.
    mockReadCache.mockResolvedValue({ kind: "none" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetRequestContext.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await GET(
      new Request(`http://localhost:3000/api/barcode-lookup/${CODE}`),
      params(CODE)
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 when the code is not 8/12/13 digits", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/barcode-lookup/abc"),
      params("abc")
    );
    expect(response.status).toBe(400);
  });

  // --- Cache short-circuits ---

  it("returns 200 from a fresh cache hit without calling any external API", async () => {
    mockReadCache.mockResolvedValue({
      kind: "hit",
      fresh: true,
      name: "Cached Milk",
      brands: "Cached Co",
      categoriesTags: ["en:dairy"],
      quantity: "1L",
      source: "off",
    });
    const fetchSpy = vi.spyOn(global, "fetch");

    const response = await GET(
      new Request(`http://localhost:3000/api/barcode-lookup/${CODE}`),
      params(CODE)
    );
    const body = (await response.json()) as { name: string };

    expect(response.status).toBe(200);
    expect(body.name).toBe("Cached Milk");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockWriteCacheHit).not.toHaveBeenCalled();
  });

  it("returns 404 from a fresh cache miss without calling any external API", async () => {
    mockReadCache.mockResolvedValue({ kind: "miss", fresh: true });
    const fetchSpy = vi.spyOn(global, "fetch");

    const response = await GET(
      new Request(`http://localhost:3000/api/barcode-lookup/${CODE}`),
      params(CODE)
    );

    expect(response.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("ignores stale cache entries and re-fetches", async () => {
    mockReadCache.mockResolvedValue({
      kind: "hit",
      fresh: false,
      name: "Stale",
      source: "off",
    });
    installFetchRouter({ off: () => offHit({ product_name: "Refreshed Milk" }) });

    const response = await GET(
      new Request(`http://localhost:3000/api/barcode-lookup/${CODE}`),
      params(CODE)
    );
    const body = (await response.json()) as { name: string };

    expect(response.status).toBe(200);
    expect(body.name).toBe("Refreshed Milk");
    expect(mockWriteCacheHit).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ barcode: CODE, source: "off", name: "Refreshed Milk" })
    );
  });

  // --- OFF path ---

  it("returns 200 with normalized data when OFF returns a hit (and writes cache)", async () => {
    const fetchSpy = installFetchRouter({ off: () => offHit() });

    const response = await GET(
      new Request(`http://localhost:3000/api/barcode-lookup/${CODE}`),
      params(CODE)
    );
    const body = (await response.json()) as {
      name: string;
      brands?: string;
      categoriesTags?: string[];
      quantity?: string;
    };

    expect(response.status).toBe(200);
    expect(body.name).toBe("Whole Milk 2L");
    expect(body.brands).toBe("Acme");

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = new Headers(init?.headers);
    expect(headers.get("user-agent")?.toLowerCase()).toContain("fresko");

    expect(mockWriteCacheHit).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        barcode: CODE,
        source: "off",
        rawResponse: expect.objectContaining({ status: 1 }),
      })
    );
  });

  it("returns 502 when OFF responds 5xx (does not fall through to UPCitemdb)", async () => {
    installFetchRouter({ off: () => new Response("upstream error", { status: 503 }) });

    const response = await GET(
      new Request(`http://localhost:3000/api/barcode-lookup/${CODE}`),
      params(CODE)
    );
    expect(response.status).toBe(502);
    expect(mockWriteCacheHit).not.toHaveBeenCalled();
    expect(mockWriteCacheMiss).not.toHaveBeenCalled();
  });

  it("returns 504 when the OFF request times out / aborts", async () => {
    vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.reject(Object.assign(new Error("aborted"), { name: "AbortError" }))
    );

    const response = await GET(
      new Request(`http://localhost:3000/api/barcode-lookup/${CODE}`),
      params(CODE)
    );
    expect(response.status).toBe(504);
  });

  // --- UPCitemdb fallback ---

  it("falls through to UPCitemdb when OFF returns a miss; writes cache hit on UPC success", async () => {
    installFetchRouter({ off: offMissBody, upc: () => upcHit("Coca-Cola Original") });

    const response = await GET(
      new Request(`http://localhost:3000/api/barcode-lookup/${CODE}`),
      params(CODE)
    );
    const body = (await response.json()) as { name: string };

    expect(response.status).toBe(200);
    expect(body.name).toBe("Coca-Cola Original");
    expect(mockWriteCacheHit).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        barcode: CODE,
        source: "upcitemdb",
        name: "Coca-Cola Original",
        rawResponse: expect.objectContaining({ code: "OK" }),
      })
    );
  });

  it("returns 404 and writes cache miss when both OFF and UPCitemdb miss", async () => {
    installFetchRouter({ off: offMissBody, upc: upcMissBody });

    const response = await GET(
      new Request(`http://localhost:3000/api/barcode-lookup/${CODE}`),
      params(CODE)
    );
    expect(response.status).toBe(404);
    // Both raw payloads are forwarded into the cache so we know exactly what
    // each upstream said for this code.
    expect(mockWriteCacheMiss).toHaveBeenCalledWith(
      {},
      CODE,
      expect.objectContaining({
        off: expect.objectContaining({ status: 0 }),
        upcitemdb: expect.objectContaining({ code: "NO_MATCH" }),
      })
    );
  });

  it("does not cache when UPCitemdb itself errors after OFF miss (so we'll retry)", async () => {
    installFetchRouter({
      off: offMissBody,
      upc: () => new Response("server error", { status: 500 }),
    });

    const response = await GET(
      new Request(`http://localhost:3000/api/barcode-lookup/${CODE}`),
      params(CODE)
    );
    expect(response.status).toBe(502);
    expect(mockWriteCacheMiss).not.toHaveBeenCalled();
    expect(mockWriteCacheHit).not.toHaveBeenCalled();
  });
});
