import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockGetRequestContext = vi.fn();

vi.mock("@/lib/api-utils", () => ({
  getRequestContext: (...args: unknown[]) => mockGetRequestContext(...args),
}));

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
};

import { GET } from "../route";

describe("GET /api/product-hints", () => {
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

    const request = new Request("http://localhost:3000/api/product-hints?name=milk");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 when name query param is missing", async () => {
    const request = new Request("http://localhost:3000/api/product-hints");
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it("returns matching hints", async () => {
    const hints = [
      { id: 1, namePattern: "milk", suggestedUnit: "L", suggestedCategory: "Dairy" },
    ];
    mockDb.limit.mockResolvedValue(hints);

    const request = new Request("http://localhost:3000/api/product-hints?name=milk");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(hints);
  });
});
