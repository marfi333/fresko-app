import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetRequestContext = vi.fn();

vi.mock("@/lib/api-utils", () => ({
  getRequestContext: (...args: unknown[]) => mockGetRequestContext(...args),
}));

const SERVER_TS = 1_700_000_000_000;

const existingEntry = {
  id: 42,
  productId: 1,
  quantity: 5,
  compartment: "fridge" as const,
  expiryDate: null,
  createdBy: "user-1",
  householdId: "hh-1",
  createdAt: new Date(SERVER_TS),
  updatedAt: new Date(SERVER_TS),
};

// Chainable Proxy thenable: every property returns the same proxy; awaiting it
// shifts the next result off the `queueRows` queue. Lets a single mock db
// service select/insert/update/delete chains of varying shapes.
const queueRows: unknown[][] = [];

const makeChainableDb = () => {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => unknown) => resolve(queueRows.shift() ?? []);
      }
      return new Proxy(() => proxy, handler);
    },
    apply() {
      return proxy;
    },
  };
  // biome-ignore lint/suspicious/noExplicitAny: chainable Proxy intentionally any
  const proxy: any = new Proxy(() => proxy, handler);
  return proxy;
};

const mockDb = makeChainableDb();

import { POST } from "../route";

const setAuth = () => {
  mockGetRequestContext.mockResolvedValue({
    db: mockDb,
    session: { user: { id: "user-1" }, session: { id: "s-1" } },
    householdId: "hh-1",
    userId: "user-1",
  });
};

const replayRequest = (items: unknown[]) =>
  new Request("http://localhost:3000/api/sync/replay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });

describe("POST /api/sync/replay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queueRows.length = 0;
    setAuth();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetRequestContext.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const response = await POST(replayRequest([]));
    expect(response.status).toBe(401);
  });

  it("returns 400 when items is not an array", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/sync/replay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: "not an array" }),
      })
    );
    expect(response.status).toBe(400);
  });

  it("returns parallel results for a mixed batch (ok / stale / gone / error)", async () => {
    queueRows.push([existingEntry]); // op2 update SELECT existing
    queueRows.push([{ ...existingEntry, quantity: 3 }]); // op2 update RETURNING
    queueRows.push([{ ...existingEntry, updatedAt: new Date(SERVER_TS + 10_000) }]); // op3 stale SELECT existing
    queueRows.push([]); // op4 gone SELECT existing

    const response = await POST(
      replayRequest([
        // op1: create — invalid (missing fields) -> error
        {
          id: "op1",
          entity: "entries",
          op: "create",
          payload: { productId: 1 }, // missing quantity + compartment
          clientTs: SERVER_TS + 1_000,
        },
        // op2: update — applies
        {
          id: "op2",
          entity: "entries",
          op: "update",
          serverId: 42,
          payload: { quantity: 3 },
          clientTs: SERVER_TS + 5_000,
        },
        // op3: update — stale (clientTs < server updatedAt)
        {
          id: "op3",
          entity: "entries",
          op: "update",
          serverId: 42,
          payload: { quantity: 4 },
          clientTs: SERVER_TS - 1_000,
        },
        // op4: delete — gone (no existing row)
        {
          id: "op4",
          entity: "entries",
          op: "delete",
          serverId: 999,
          payload: {},
          clientTs: SERVER_TS + 1_000,
        },
      ])
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { results: Array<{ id: string; status: string }> };
    // Diagnostic if this fails: include all reasons to see what blew up.
    const summarized = body.results.map((r) => ({
      id: r.id,
      status: r.status,
      reason: (r as { reason?: string }).reason,
    }));
    expect(summarized).toEqual([
      { id: "op1", status: "error", reason: expect.any(String) },
      { id: "op2", status: "ok", reason: undefined },
      { id: "op3", status: "skipped", reason: "stale" },
      { id: "op4", status: "gone", reason: undefined },
    ]);
  });

  it("handles a single create op end-to-end", async () => {
    queueRows.push([existingEntry]); // RETURNING
    const response = await POST(
      replayRequest([
        {
          id: "op1",
          entity: "categories",
          op: "create",
          payload: { name: "Dairy" },
          clientTs: SERVER_TS,
        },
      ])
    );
    const body = (await response.json()) as { results: Array<{ id: string; status: string }> };
    expect(body.results).toHaveLength(1);
    expect(body.results[0]?.status).toBe("ok");
  });

  it("returns error when create payload is missing required fields (entries)", async () => {
    const response = await POST(
      replayRequest([
        {
          id: "op1",
          entity: "entries",
          op: "create",
          payload: {},
          clientTs: SERVER_TS,
        },
      ])
    );
    const body = (await response.json()) as { results: Array<{ id: string; status: string }> };
    expect(body.results[0]?.status).toBe("error");
  });

  it("returns error for unknown op", async () => {
    const response = await POST(
      replayRequest([
        {
          id: "op1",
          entity: "entries",
          op: "weird-op",
          payload: {},
          clientTs: SERVER_TS,
        },
      ])
    );
    const body = (await response.json()) as { results: Array<{ id: string; status: string }> };
    expect(body.results[0]?.status).toBe("error");
  });
});
