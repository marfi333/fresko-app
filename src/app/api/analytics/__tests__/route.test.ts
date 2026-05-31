import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetRequestContext = vi.fn();

vi.mock("@/lib/api-utils", () => ({
  getRequestContext: (...args: unknown[]) => mockGetRequestContext(...args),
}));

// Queue of resolved values, in the order the route awaits them: trend → top → waste.
const queryResults: unknown[][] = [];
const nextResult = () => Promise.resolve(queryResults.shift() ?? []);

// `mockDb` proxies any method to a chainable that's also awaitable.
// Awaiting it pops the next queued result, regardless of which method
// the route awaits the chain at (groupBy / limit / orderBy / where).
const makeChain = () => {
  const chain: Record<string, unknown> = {};
  const handler: ProxyHandler<typeof chain> = {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
          nextResult().then(resolve, reject);
      }
      return (..._args: unknown[]) => proxy;
    },
  };
  const proxy: typeof chain = new Proxy(chain, handler);
  return proxy;
};

const mockDb = {
  select: vi.fn(() => makeChain()),
};

import { GET } from "../route";

const setAuth = () => {
  mockGetRequestContext.mockResolvedValue({
    db: mockDb,
    session: { user: { id: "user-1" }, session: { id: "s-1" } },
    householdId: "hh-1",
    userId: "user-1",
  });
};

const queueResults = (...results: unknown[][]) => {
  queryResults.length = 0;
  queryResults.push(...results);
};

describe("GET /api/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryResults.length = 0;
    setAuth();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetRequestContext.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const response = await GET(new Request("http://localhost:3000/api/analytics"));
    expect(response.status).toBe(401);
  });

  it("returns response shape with trend/top/waste; defaults to 30d", async () => {
    queueResults([], [], []); // trend, top, waste

    const response = await GET(new Request("http://localhost:3000/api/analytics"));
    const body = (await response.json()) as {
      trend: unknown[];
      top: unknown[];
      waste: { consumed: number; expired: number; discarded: number; wastePct: number };
    };

    expect(response.status).toBe(200);
    expect(Array.isArray(body.trend)).toBe(true);
    expect(body.trend).toHaveLength(30);
    expect(Array.isArray(body.top)).toBe(true);
    expect(body.waste).toEqual({ consumed: 0, expired: 0, discarded: 0, wastePct: 0 });
  });

  it("rejects unknown range with 400", async () => {
    const response = await GET(new Request("http://localhost:3000/api/analytics?range=foo"));
    expect(response.status).toBe(400);
  });

  it("accepts 7d / 90d / 12mo and returns matching bucket counts", async () => {
    for (const [range, expected] of [
      ["7d", 7],
      ["90d", 13],
      ["12mo", 12],
    ] as const) {
      setAuth();
      queueResults([], [], []);

      const response = await GET(new Request(`http://localhost:3000/api/analytics?range=${range}`));
      const body = (await response.json()) as { trend: unknown[] };
      expect(response.status).toBe(200);
      expect(body.trend).toHaveLength(expected);
    }
  });

  it("computes waste percentage from waste row counts", async () => {
    queueResults(
      [], // trend
      [], // top
      [
        { reason: "consumed", count: 8 },
        { reason: "expired", count: 1 },
        { reason: "discarded", count: 1 },
      ] // waste
    );

    const response = await GET(new Request("http://localhost:3000/api/analytics"));
    const body = (await response.json()) as {
      waste: { consumed: number; expired: number; discarded: number; wastePct: number };
    };
    expect(body.waste).toEqual({
      consumed: 8,
      expired: 1,
      discarded: 1,
      wastePct: 20.0,
    });
  });

  it("passes top items through to the response", async () => {
    queueResults(
      [], // trend
      [
        { productId: 1, name: "Milk", total: 5, unit: "L" },
        { productId: 2, name: "Eggs", total: 3, unit: "pieces" },
      ], // top
      [] // waste
    );

    const response = await GET(new Request("http://localhost:3000/api/analytics"));
    const body = (await response.json()) as {
      top: { productId: number; name: string; total: number }[];
    };
    expect(body.top).toHaveLength(2);
    expect(body.top[0]).toMatchObject({ productId: 1, name: "Milk", total: 5 });
  });
});
