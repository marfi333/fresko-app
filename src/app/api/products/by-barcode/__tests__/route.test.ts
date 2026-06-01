import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetRequestContext = vi.fn();

vi.mock("@/lib/api-utils", () => ({
  getRequestContext: (...args: unknown[]) => mockGetRequestContext(...args),
}));

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([]),
};

import { GET } from "../route";

describe("GET /api/products/by-barcode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRequestContext.mockResolvedValue({
      db: mockDb,
      session: { user: { id: "user-1" }, session: { id: "s-1" } },
      householdId: "hh-1",
      userId: "user-1",
    });
    mockDb.where.mockResolvedValue([]);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetRequestContext.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const request = new Request("http://localhost:3000/api/products/by-barcode?code=5901234123457");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 when code parameter is missing", async () => {
    const request = new Request("http://localhost:3000/api/products/by-barcode");
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 when code parameter is not 8/12/13 digits", async () => {
    const request = new Request("http://localhost:3000/api/products/by-barcode?code=abc123");
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("returns 404 when no product matches the barcode", async () => {
    mockDb.where.mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/products/by-barcode?code=5901234123457");
    const response = await GET(request);
    expect(response.status).toBe(404);
  });

  it("returns 200 with the product when a match is found", async () => {
    const product = {
      id: 7,
      name: "Whole Milk",
      unit: "L",
      categoryId: 1,
      householdId: "hh-1",
      barcode: "5901234123457",
      createdAt: new Date("2026-05-01"),
      updatedAt: new Date("2026-05-01"),
    };
    mockDb.where.mockResolvedValue([product]);

    const request = new Request("http://localhost:3000/api/products/by-barcode?code=5901234123457");
    const response = await GET(request);
    const body = (await response.json()) as { id: number; name: string; barcode: string };

    expect(response.status).toBe(200);
    expect(body.id).toBe(7);
    expect(body.barcode).toBe("5901234123457");
  });
});
