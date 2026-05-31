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

  it("returns Entry[]-shaped rows when filtering by categoryId (regression: dairy filter)", async () => {
    // Route MUST use explicit .select({ ... }) projection so the shape is invariant.
    // We verify by inspecting the argument passed to .select() in the categoryId branch.
    mockDb.orderBy.mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/entries?categoryId=3");
    const response = await GET(request);

    expect(response.status).toBe(200);
    // The categoryId branch must call .select with a projection object,
    // not select() with no args (which returns { entries, products } join rows).
    const selectCalls = mockDb.select.mock.calls;
    expect(selectCalls.length).toBeGreaterThan(0);
    const lastCall = selectCalls[selectCalls.length - 1];
    expect(lastCall[0]).toBeDefined();
    expect(lastCall[0]).toHaveProperty("id");
    expect(lastCall[0]).toHaveProperty("productId");
    expect(lastCall[0]).toHaveProperty("quantity");
    expect(lastCall[0]).toHaveProperty("compartment");
    expect(lastCall[0]).toHaveProperty("expiryDate");
    expect(lastCall[0]).toHaveProperty("createdBy");
    expect(lastCall[0]).toHaveProperty("householdId");
    expect(lastCall[0]).toHaveProperty("createdAt");
  });

  it("filters by compartment AND categoryId together (regression: dairy on fridge tab)", async () => {
    mockDb.orderBy.mockResolvedValue([]);

    const request = new Request(
      "http://localhost:3000/api/entries?compartment=fridge&categoryId=3"
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
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
