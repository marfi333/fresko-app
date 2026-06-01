import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetRequestContext = vi.fn();

vi.mock("@/lib/api-utils", () => ({
  getRequestContext: (...args: unknown[]) => mockGetRequestContext(...args),
}));

const SERVER_TS = 1_700_000_000_000;

const existingEntry = {
  id: 1,
  productId: 1,
  quantity: 5,
  compartment: "fridge",
  householdId: "hh-1",
  updatedAt: new Date(SERVER_TS),
};

const mockWhere = vi.fn();
const mockReturning = vi.fn();

const mockDb = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: mockWhere,
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: mockReturning,
      })),
    })),
  })),
  delete: vi.fn(() => ({
    where: vi.fn().mockResolvedValue(undefined),
  })),
  insert: vi.fn(() => ({
    values: vi.fn().mockReturnThis(),
  })),
};

import { DELETE, PATCH } from "../route";

const params = Promise.resolve({ id: "1" });

describe("PATCH /api/entries/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRequestContext.mockResolvedValue({
      db: mockDb,
      session: { user: { id: "user-1" }, session: { id: "s-1" } },
      householdId: "hh-1",
      userId: "user-1",
    });
    mockWhere.mockResolvedValue([existingEntry]);
    mockReturning.mockResolvedValue([{ ...existingEntry, quantity: 3 }]);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetRequestContext.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const request = new Request("http://localhost:3000/api/entries/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: 3 }),
    });
    const response = await PATCH(request, { params });
    expect(response.status).toBe(401);
  });

  it("updates entry quantity", async () => {
    const request = new Request("http://localhost:3000/api/entries/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: 3 }),
    });
    const response = await PATCH(request, { params });
    const body = (await response.json()) as { quantity: number };

    expect(response.status).toBe(200);
    expect(body.quantity).toBe(3);
  });

  it("returns 404 when entry not found", async () => {
    mockWhere.mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/entries/999", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: 3 }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: "999" }) });
    expect(response.status).toBe(404);
  });

  describe("LWW (clientTs)", () => {
    it("applies the update when clientTs >= existing.updatedAt", async () => {
      const request = new Request("http://localhost:3000/api/entries/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 3, clientTs: SERVER_TS + 1_000 }),
      });
      const response = await PATCH(request, { params });
      expect(response.status).toBe(200);
      expect(mockReturning).toHaveBeenCalled();
    });

    it("returns 200 + { skipped: 'stale' } when clientTs < existing.updatedAt", async () => {
      const request = new Request("http://localhost:3000/api/entries/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 3, clientTs: SERVER_TS - 1_000 }),
      });
      const response = await PATCH(request, { params });
      const body = (await response.json()) as { skipped: string; current?: unknown };
      expect(response.status).toBe(200);
      expect(body.skipped).toBe("stale");
      expect(body.current).toBeDefined();
      expect(mockReturning).not.toHaveBeenCalled();
    });

    it("returns 200 + { skipped: 'gone' } when row missing AND clientTs provided", async () => {
      mockWhere.mockResolvedValue([]);
      const request = new Request("http://localhost:3000/api/entries/999", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 3, clientTs: SERVER_TS + 1_000 }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: "999" }) });
      const body = (await response.json()) as { skipped: string };
      expect(response.status).toBe(200);
      expect(body.skipped).toBe("gone");
    });

    it("does not leak clientTs into the entries.set payload", async () => {
      const setSpy = vi.fn(() => ({
        where: vi.fn(() => ({ returning: mockReturning })),
      }));
      mockDb.update.mockImplementationOnce(() => ({ set: setSpy }));

      const request = new Request("http://localhost:3000/api/entries/1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 3, clientTs: SERVER_TS + 1_000 }),
      });
      await PATCH(request, { params });

      expect(setSpy).toHaveBeenCalledWith(
        expect.not.objectContaining({ clientTs: expect.anything() })
      );
    });
  });
});

describe("DELETE /api/entries/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRequestContext.mockResolvedValue({
      db: mockDb,
      session: { user: { id: "user-1" }, session: { id: "s-1" } },
      householdId: "hh-1",
      userId: "user-1",
    });
    mockWhere.mockResolvedValue([existingEntry]);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetRequestContext.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const request = new Request("http://localhost:3000/api/entries/1", {
      method: "DELETE",
    });
    const response = await DELETE(request, { params });
    expect(response.status).toBe(401);
  });

  it("deletes entry and creates usage event", async () => {
    const request = new Request("http://localhost:3000/api/entries/1", {
      method: "DELETE",
    });
    const response = await DELETE(request, { params });

    expect(response.status).toBe(200);
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it("returns 404 when entry not found", async () => {
    mockWhere.mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/entries/999", {
      method: "DELETE",
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: "999" }) });
    expect(response.status).toBe(404);
  });

  describe("LWW (clientTs)", () => {
    it("applies delete when clientTs >= existing.updatedAt", async () => {
      const request = new Request("http://localhost:3000/api/entries/1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientTs: SERVER_TS + 1_000 }),
      });
      const response = await DELETE(request, { params });
      expect(response.status).toBe(200);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("returns { skipped: 'stale' } when clientTs < existing.updatedAt and does not delete", async () => {
      const request = new Request("http://localhost:3000/api/entries/1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientTs: SERVER_TS - 1_000 }),
      });
      const response = await DELETE(request, { params });
      const body = (await response.json()) as { skipped: string };
      expect(response.status).toBe(200);
      expect(body.skipped).toBe("stale");
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it("returns { skipped: 'gone' } when row missing AND clientTs provided", async () => {
      mockWhere.mockResolvedValue([]);
      const request = new Request("http://localhost:3000/api/entries/999", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientTs: SERVER_TS + 1_000 }),
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: "999" }) });
      const body = (await response.json()) as { skipped: string };
      expect(response.status).toBe(200);
      expect(body.skipped).toBe("gone");
    });
  });
});
