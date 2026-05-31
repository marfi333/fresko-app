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
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

const baseRow = {
  id: 5,
  householdId: "hh-1",
  productId: 10,
  name: "Yogurt",
  quantity: 1,
  unit: "packs",
  purchased: false,
  createdBy: "user-1",
  createdAt: new Date("2026-05-31T00:00:00Z"),
  purchasedAt: null,
};

import { DELETE, PATCH } from "../[id]/route";

const setAuth = () => {
  mockGetRequestContext.mockResolvedValue({
    db: mockDb,
    session: { user: { id: "user-1" }, session: { id: "s-1" } },
    householdId: "hh-1",
    userId: "user-1",
  });
};

const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("PATCH /api/shopping/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth();
    mockDb.where.mockImplementation(() => mockDb);
  });

  it("returns 404 when item not found in household", async () => {
    mockDb.where.mockResolvedValueOnce([]); // existing select
    const response = await PATCH(
      new Request("http://localhost:3000/api/shopping/5", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchased: true }),
      }),
      params("5")
    );
    expect(response.status).toBe(404);
  });

  it("toggling purchased true sets purchasedAt", async () => {
    mockDb.where.mockResolvedValueOnce([baseRow]);
    mockDb.returning.mockResolvedValueOnce([
      { ...baseRow, purchased: true, purchasedAt: new Date() },
    ]);
    const response = await PATCH(
      new Request("http://localhost:3000/api/shopping/5", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchased: true }),
      }),
      params("5")
    );
    expect(response.status).toBe(200);
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ purchased: true, purchasedAt: expect.any(Date) })
    );
  });

  it("toggling purchased false clears purchasedAt", async () => {
    mockDb.where.mockResolvedValueOnce([{ ...baseRow, purchased: true, purchasedAt: new Date() }]);
    mockDb.returning.mockResolvedValueOnce([{ ...baseRow, purchased: false, purchasedAt: null }]);
    const response = await PATCH(
      new Request("http://localhost:3000/api/shopping/5", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchased: false }),
      }),
      params("5")
    );
    expect(response.status).toBe(200);
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ purchased: false, purchasedAt: null })
    );
  });

  it("can edit name/quantity/unit", async () => {
    mockDb.where.mockResolvedValueOnce([baseRow]);
    mockDb.returning.mockResolvedValueOnce([
      { ...baseRow, name: "Greek Yogurt", quantity: 2, unit: "kg" },
    ]);
    const response = await PATCH(
      new Request("http://localhost:3000/api/shopping/5", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Greek Yogurt", quantity: 2, unit: "kg" }),
      }),
      params("5")
    );
    expect(response.status).toBe(200);
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Greek Yogurt", quantity: 2, unit: "kg" })
    );
  });
});

describe("DELETE /api/shopping/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth();
    mockDb.where.mockImplementation(() => mockDb);
  });

  it("returns 404 when not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);
    const response = await DELETE(
      new Request("http://localhost:3000/api/shopping/5", { method: "DELETE" }),
      params("5")
    );
    expect(response.status).toBe(404);
  });

  it("deletes when found", async () => {
    mockDb.where.mockResolvedValueOnce([baseRow]);
    mockDb.where.mockReturnValueOnce(Promise.resolve(undefined));
    const response = await DELETE(
      new Request("http://localhost:3000/api/shopping/5", { method: "DELETE" }),
      params("5")
    );
    expect(response.status).toBe(200);
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetRequestContext.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const response = await DELETE(
      new Request("http://localhost:3000/api/shopping/5", { method: "DELETE" }),
      params("5")
    );
    expect(response.status).toBe(401);
  });
});
