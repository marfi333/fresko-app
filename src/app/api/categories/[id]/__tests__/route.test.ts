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

const SERVER_TS = Date.UTC(2026, 4, 31);

const baseRow = {
  id: 7,
  name: "Dairy",
  householdId: "hh-1",
  createdAt: new Date("2026-05-01"),
  updatedAt: new Date(SERVER_TS),
};

import { DELETE, PATCH } from "../route";

const setAuth = () => {
  mockGetRequestContext.mockResolvedValue({
    db: mockDb,
    session: { user: { id: "user-1" }, session: { id: "s-1" } },
    householdId: "hh-1",
    userId: "user-1",
  });
};

const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("PATCH /api/categories/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth();
    mockDb.where.mockImplementation(() => mockDb);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetRequestContext.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const response = await PATCH(
      new Request("http://localhost:3000/api/categories/7", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Dairy & Eggs" }),
      }),
      params("7")
    );
    expect(response.status).toBe(401);
  });

  it("returns 404 when category not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);
    const response = await PATCH(
      new Request("http://localhost:3000/api/categories/7", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Dairy & Eggs" }),
      }),
      params("7")
    );
    expect(response.status).toBe(404);
  });

  it("returns 400 when name missing", async () => {
    mockDb.where.mockResolvedValueOnce([baseRow]);
    const response = await PATCH(
      new Request("http://localhost:3000/api/categories/7", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      params("7")
    );
    expect(response.status).toBe(400);
  });

  it("renames category", async () => {
    mockDb.where.mockResolvedValueOnce([baseRow]);
    mockDb.returning.mockResolvedValueOnce([{ ...baseRow, name: "Dairy & Eggs" }]);
    const response = await PATCH(
      new Request("http://localhost:3000/api/categories/7", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Dairy & Eggs" }),
      }),
      params("7")
    );
    expect(response.status).toBe(200);
    expect(mockDb.set).toHaveBeenCalledWith({ name: "Dairy & Eggs" });
  });

  describe("LWW (clientTs)", () => {
    it("applies update when clientTs >= existing.updatedAt", async () => {
      mockDb.where.mockResolvedValueOnce([baseRow]);
      mockDb.returning.mockResolvedValueOnce([{ ...baseRow, name: "Dairy & Eggs" }]);
      const response = await PATCH(
        new Request("http://localhost:3000/api/categories/7", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Dairy & Eggs", clientTs: SERVER_TS + 1_000 }),
        }),
        params("7")
      );
      expect(response.status).toBe(200);
      expect(mockDb.set).toHaveBeenCalledWith({ name: "Dairy & Eggs" });
    });

    it("returns { skipped: 'stale' } when clientTs < existing.updatedAt", async () => {
      mockDb.where.mockResolvedValueOnce([baseRow]);
      const response = await PATCH(
        new Request("http://localhost:3000/api/categories/7", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Dairy & Eggs", clientTs: SERVER_TS - 1_000 }),
        }),
        params("7")
      );
      const body = (await response.json()) as { skipped: string };
      expect(response.status).toBe(200);
      expect(body.skipped).toBe("stale");
      expect(mockDb.set).not.toHaveBeenCalled();
    });

    it("returns { skipped: 'gone' } when row missing AND clientTs provided", async () => {
      mockDb.where.mockResolvedValueOnce([]);
      const response = await PATCH(
        new Request("http://localhost:3000/api/categories/7", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Dairy & Eggs", clientTs: SERVER_TS + 1_000 }),
        }),
        params("7")
      );
      const body = (await response.json()) as { skipped: string };
      expect(response.status).toBe(200);
      expect(body.skipped).toBe("gone");
    });
  });
});

describe("DELETE /api/categories/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuth();
    mockDb.where.mockImplementation(() => mockDb);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetRequestContext.mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const response = await DELETE(
      new Request("http://localhost:3000/api/categories/7", { method: "DELETE" }),
      params("7")
    );
    expect(response.status).toBe(401);
  });

  it("returns 404 when not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);
    const response = await DELETE(
      new Request("http://localhost:3000/api/categories/7", { method: "DELETE" }),
      params("7")
    );
    expect(response.status).toBe(404);
  });

  it("deletes when found", async () => {
    mockDb.where.mockResolvedValueOnce([baseRow]);
    const response = await DELETE(
      new Request("http://localhost:3000/api/categories/7", { method: "DELETE" }),
      params("7")
    );
    expect(response.status).toBe(200);
    expect(mockDb.delete).toHaveBeenCalled();
  });

  describe("LWW (clientTs)", () => {
    it("returns { skipped: 'stale' } and skips delete when clientTs < existing.updatedAt", async () => {
      mockDb.where.mockResolvedValueOnce([baseRow]);
      const response = await DELETE(
        new Request("http://localhost:3000/api/categories/7", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientTs: SERVER_TS - 1_000 }),
        }),
        params("7")
      );
      const body = (await response.json()) as { skipped: string };
      expect(response.status).toBe(200);
      expect(body.skipped).toBe("stale");
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it("returns { skipped: 'gone' } when row missing AND clientTs provided", async () => {
      mockDb.where.mockResolvedValueOnce([]);
      const response = await DELETE(
        new Request("http://localhost:3000/api/categories/7", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientTs: SERVER_TS + 1_000 }),
        }),
        params("7")
      );
      const body = (await response.json()) as { skipped: string };
      expect(response.status).toBe(200);
      expect(body.skipped).toBe("gone");
    });
  });
});
