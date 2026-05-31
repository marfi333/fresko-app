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
  returning: vi
    .fn()
    .mockResolvedValue([{ id: 1, name: "Milk", unit: "L", categoryId: 1, householdId: "hh-1" }]),
};

import { GET, POST } from "../route";

describe("GET /api/products", () => {
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

    const request = new Request("http://localhost:3000/api/products");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns products for the household", async () => {
    const products = [{ id: 1, name: "Milk", unit: "L", categoryId: 1, householdId: "hh-1" }];
    mockDb.orderBy.mockResolvedValue(products);

    const request = new Request("http://localhost:3000/api/products");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(products);
  });

  it("supports search query parameter", async () => {
    mockDb.orderBy.mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/products?search=milk");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockDb.where).toHaveBeenCalled();
  });
});

describe("POST /api/products", () => {
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

    const request = new Request("http://localhost:3000/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Milk", unit: "L" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("creates a product and returns it", async () => {
    const request = new Request("http://localhost:3000/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Milk", unit: "L", categoryId: 1 }),
    });
    const response = await POST(request);
    const body = (await response.json()) as { name: string };

    expect(response.status).toBe(201);
    expect(body.name).toBe("Milk");
  });

  it("returns 400 for missing required fields", async () => {
    const request = new Request("http://localhost:3000/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("persists an optional barcode when provided", async () => {
    const request = new Request("http://localhost:3000/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Milk", unit: "L", barcode: "5901234123457" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockDb.values).toHaveBeenCalledWith(
      expect.objectContaining({ barcode: "5901234123457" })
    );
  });

  it("returns 400 for an invalid barcode (non 8/12/13 digits)", async () => {
    const request = new Request("http://localhost:3000/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Milk", unit: "L", barcode: "abc" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("treats omitted barcode as null", async () => {
    const request = new Request("http://localhost:3000/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Milk", unit: "L" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({ barcode: null }));
  });
});
