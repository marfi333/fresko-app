import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetRequestContext = vi.fn();

vi.mock("@/lib/api-utils", () => ({
  getRequestContext: (...args: unknown[]) => mockGetRequestContext(...args),
}));

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockResolvedValue([]),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([
    {
      id: 1,
      householdId: "hh-1",
      productId: null,
      name: "Milk",
      quantity: null,
      unit: null,
      purchased: false,
      createdBy: "user-1",
      createdAt: new Date("2026-05-31T00:00:00Z"),
      purchasedAt: null,
    },
  ]),
};

import { GET, POST } from "../route";

const setAuth = () => {
  mockGetRequestContext.mockResolvedValue({
    db: mockDb,
    session: { user: { id: "user-1" }, session: { id: "s-1" } },
    householdId: "hh-1",
    userId: "user-1",
  });
};

describe("GET /api/shopping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetRequestContext.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const response = await GET(new Request("http://localhost:3000/api/shopping"));
    expect(response.status).toBe(401);
  });

  it("returns active and purchased lists scoped to household", async () => {
    const active = [
      { id: 2, householdId: "hh-1", purchased: false, name: "Eggs", productId: null },
    ];
    const purchased = [
      { id: 3, householdId: "hh-1", purchased: true, name: "Bread", productId: null },
    ];
    mockDb.orderBy.mockResolvedValueOnce(active).mockResolvedValueOnce(purchased);

    const response = await GET(new Request("http://localhost:3000/api/shopping"));
    const body = (await response.json()) as { active: unknown[]; purchased: unknown[] };

    expect(response.status).toBe(200);
    expect(body.active).toEqual(active);
    expect(body.purchased).toEqual(purchased);
    expect(mockDb.where).toHaveBeenCalledTimes(2);
  });
});

describe("POST /api/shopping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetRequestContext.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const response = await POST(
      new Request("http://localhost:3000/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Milk" }),
      })
    );
    expect(response.status).toBe(401);
  });

  it("creates an item with name only", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Milk" }),
      })
    );
    const body = (await response.json()) as { id: number; name: string };
    expect(response.status).toBe(201);
    expect(body.id).toBe(1);
    expect(body.name).toBe("Milk");
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("creates an item with productId, quantity, unit", async () => {
    mockDb.returning.mockResolvedValueOnce([
      {
        id: 4,
        householdId: "hh-1",
        productId: 7,
        name: "Apples",
        quantity: 3,
        unit: "pieces",
        purchased: false,
      },
    ]);
    const response = await POST(
      new Request("http://localhost:3000/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Apples", productId: 7, quantity: 3, unit: "pieces" }),
      })
    );
    const body = (await response.json()) as { productId: number };
    expect(response.status).toBe(201);
    expect(body.productId).toBe(7);
  });

  it("returns 400 when name is missing or empty", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }),
      })
    );
    expect(response.status).toBe(400);
  });
});
