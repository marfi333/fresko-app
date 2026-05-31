import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetRequestContext = vi.fn();

vi.mock("@/lib/api-utils", () => ({
  getRequestContext: (...args: unknown[]) => mockGetRequestContext(...args),
}));

const mockOrderBy = vi.fn();
const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);

const mockDb = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        orderBy: mockOrderBy,
      })),
    })),
  })),
  insert: vi.fn(() => ({
    values: mockInsertValues,
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: mockUpdateWhere,
    })),
  })),
  delete: vi.fn(() => ({
    where: mockDeleteWhere,
  })),
};

import { POST } from "../route";

describe("POST /api/entries/decrease", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRequestContext.mockResolvedValue({
      db: mockDb,
      session: { user: { id: "user-1" }, session: { id: "s-1" } },
      householdId: "hh-1",
      userId: "user-1",
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetRequestContext.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const request = new Request("http://localhost:3000/api/entries/decrease", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: 1, amount: 2 }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 for missing fields", async () => {
    const request = new Request("http://localhost:3000/api/entries/decrease", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: 1 }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("deducts from entries in FEFO order", async () => {
    mockOrderBy.mockResolvedValue([
      { id: 1, productId: 1, quantity: 3, expiryDate: new Date("2026-06-01"), householdId: "hh-1" },
      { id: 2, productId: 1, quantity: 5, expiryDate: new Date("2026-07-01"), householdId: "hh-1" },
    ]);

    const request = new Request("http://localhost:3000/api/entries/decrease", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: 1, amount: 2 }),
    });
    const response = await POST(request);
    const body = (await response.json()) as { decreasedTotal: number };

    expect(response.status).toBe(200);
    expect(body.decreasedTotal).toBe(2);
  });

  it("deletes entries that reach zero quantity", async () => {
    mockOrderBy.mockResolvedValue([
      { id: 1, productId: 1, quantity: 1, expiryDate: new Date("2026-06-01"), householdId: "hh-1" },
      { id: 2, productId: 1, quantity: 5, expiryDate: new Date("2026-07-01"), householdId: "hh-1" },
    ]);

    const request = new Request("http://localhost:3000/api/entries/decrease", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: 1, amount: 3 }),
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockDeleteWhere).toHaveBeenCalled();
  });

  it("returns 404 when no entries exist for product", async () => {
    mockOrderBy.mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/entries/decrease", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: 999, amount: 1 }),
    });
    const response = await POST(request);
    expect(response.status).toBe(404);
  });

  it("returns 400 when amount exceeds available quantity", async () => {
    mockOrderBy.mockResolvedValue([
      { id: 1, productId: 1, quantity: 2, expiryDate: null, householdId: "hh-1" },
    ]);

    const request = new Request("http://localhost:3000/api/entries/decrease", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: 1, amount: 10 }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
