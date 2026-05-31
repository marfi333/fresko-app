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
  innerJoin: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockResolvedValue([]),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([
    {
      id: 1,
      productId: 1,
      quantity: 2,
      compartment: "fridge",
      expiryDate: null,
      createdBy: "user-1",
      householdId: "hh-1",
    },
  ]),
};

import { GET, POST } from "../route";

describe("GET /api/entries", () => {
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

    const request = new Request("http://localhost:3000/api/entries");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns entries for the household", async () => {
    const entries = [{ id: 1, productId: 1, quantity: 2, compartment: "fridge" }];
    mockDb.orderBy.mockResolvedValue(entries);

    const request = new Request("http://localhost:3000/api/entries");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(entries);
  });

  it("filters by compartment", async () => {
    mockDb.orderBy.mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/entries?compartment=fridge");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockDb.where).toHaveBeenCalled();
  });

  it("filters by categoryId", async () => {
    mockDb.orderBy.mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/entries?categoryId=3");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockDb.innerJoin).toHaveBeenCalled();
  });
});

describe("POST /api/entries", () => {
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

    const request = new Request("http://localhost:3000/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: 1, quantity: 2, compartment: "fridge" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("creates an entry", async () => {
    const request = new Request("http://localhost:3000/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: 1,
        quantity: 2,
        compartment: "fridge",
      }),
    });
    const response = await POST(request);
    const body = (await response.json()) as { id: number };

    expect(response.status).toBe(201);
    expect(body.id).toBe(1);
  });

  it("returns 400 for missing required fields", async () => {
    const request = new Request("http://localhost:3000/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: 1 }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid compartment", async () => {
    const request = new Request("http://localhost:3000/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: 1,
        quantity: 2,
        compartment: "garage",
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
