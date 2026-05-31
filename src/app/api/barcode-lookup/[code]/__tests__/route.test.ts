import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetRequestContext = vi.fn();

vi.mock("@/lib/api-utils", () => ({
  getRequestContext: (...args: unknown[]) => mockGetRequestContext(...args),
}));

import { GET } from "../route";

const params = (code: string) => ({ params: Promise.resolve({ code }) });

describe("GET /api/barcode-lookup/[code]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRequestContext.mockResolvedValue({
      db: {},
      session: { user: { id: "user-1" }, session: { id: "s-1" } },
      householdId: "hh-1",
      userId: "user-1",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetRequestContext.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const request = new Request("http://localhost:3000/api/barcode-lookup/5901234123457");
    const response = await GET(request, params("5901234123457"));
    expect(response.status).toBe(401);
  });

  it("returns 400 when the code is not 8/12/13 digits", async () => {
    const request = new Request("http://localhost:3000/api/barcode-lookup/abc");
    const response = await GET(request, params("abc"));
    expect(response.status).toBe(400);
  });

  it("returns 200 with normalized product data when OFF returns a hit", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 1,
          product: {
            product_name: "Whole Milk 2L",
            brands: "Acme",
            categories_tags: ["en:dairy", "en:milk"],
            quantity: "2L",
          },
        }),
        { status: 200 }
      )
    );

    const request = new Request("http://localhost:3000/api/barcode-lookup/5901234123457");
    const response = await GET(request, params("5901234123457"));
    const body = (await response.json()) as {
      name: string;
      brands?: string;
      categoriesTags?: string[];
      quantity?: string;
    };

    expect(response.status).toBe(200);
    expect(body.name).toBe("Whole Milk 2L");
    expect(body.brands).toBe("Acme");
    expect(body.categoriesTags).toEqual(["en:dairy", "en:milk"]);
    expect(body.quantity).toBe("2L");

    const calledUrl = String(fetchSpy.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("openfoodfacts.org");
    expect(calledUrl).toContain("5901234123457");

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = new Headers(init?.headers);
    expect(headers.get("user-agent")?.toLowerCase()).toContain("fresko");
  });

  it("returns 404 when OFF responds with status: 0", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: 0 }), { status: 200 })
    );

    const request = new Request("http://localhost:3000/api/barcode-lookup/5901234123457");
    const response = await GET(request, params("5901234123457"));
    expect(response.status).toBe(404);
  });

  it("returns 404 when OFF responds with HTTP 404", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response("not found", { status: 404 }));

    const request = new Request("http://localhost:3000/api/barcode-lookup/5901234123457");
    const response = await GET(request, params("5901234123457"));
    expect(response.status).toBe(404);
  });

  it("returns 502 when OFF responds 5xx", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response("upstream error", { status: 503 }));

    const request = new Request("http://localhost:3000/api/barcode-lookup/5901234123457");
    const response = await GET(request, params("5901234123457"));
    expect(response.status).toBe(502);
  });

  it("returns 504 when the OFF request times out / aborts", async () => {
    vi.spyOn(global, "fetch").mockImplementation(() => {
      const err = new DOMException("aborted", "AbortError");
      return Promise.reject(err);
    });

    const request = new Request("http://localhost:3000/api/barcode-lookup/5901234123457");
    const response = await GET(request, params("5901234123457"));
    expect(response.status).toBe(504);
  });
});
