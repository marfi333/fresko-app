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
  leftJoin: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  having: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
};

import { GET } from "../suggestions/route";

const setAuth = () => {
  mockGetRequestContext.mockResolvedValue({
    db: mockDb,
    session: { user: { id: "user-1" }, session: { id: "s-1" } },
    householdId: "hh-1",
    userId: "user-1",
  });
};

describe("GET /api/shopping/suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetRequestContext.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const response = await GET(new Request("http://localhost:3000/api/shopping/suggestions"));
    expect(response.status).toBe(401);
  });

  it("returns suggestion list (out-of-stock products with prior usage, not on active list)", async () => {
    const suggestions = [
      { productId: 1, name: "Milk", unit: "L", lastUsedAt: new Date("2026-05-20") },
      { productId: 2, name: "Eggs", unit: "pieces", lastUsedAt: new Date("2026-05-18") },
    ];
    mockDb.limit.mockResolvedValueOnce(suggestions);

    const response = await GET(new Request("http://localhost:3000/api/shopping/suggestions"));
    const body = (await response.json()) as {
      suggestions: { productId: number; name: string; unit: string; lastUsedAt: string }[];
    };
    expect(response.status).toBe(200);
    expect(body.suggestions).toHaveLength(2);
    expect(body.suggestions[0].productId).toBe(1);
    expect(body.suggestions[0].lastUsedAt).toBe("2026-05-20T00:00:00.000Z");
    expect(mockDb.limit).toHaveBeenCalledWith(10);
  });
});
