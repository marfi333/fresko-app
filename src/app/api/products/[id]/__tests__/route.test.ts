import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetRequestContext = vi.fn();

vi.mock("@/lib/api-utils", () => ({
  getRequestContext: (...args: unknown[]) => mockGetRequestContext(...args),
}));

type ChainableDb = {
  select: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
};

const mockDb: ChainableDb = {
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  returning: vi.fn(),
};

const setupChain = (selectRows: unknown[], updateRows: unknown[]) => {
  const selectChain = {
    from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(selectRows) }),
  };
  const updateChain = {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(updateRows),
      }),
    }),
  };
  mockDb.select.mockReturnValue(selectChain);
  mockDb.update.mockReturnValue(updateChain);
  return { selectChain, updateChain };
};

import { PATCH } from "../route";

const buildRequest = (body: unknown) =>
  new Request("http://localhost:3000/api/products/1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const buildParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("PATCH /api/products/:id", () => {
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

    const response = await PATCH(buildRequest({ categoryId: 2 }), buildParams("1"));
    expect(response.status).toBe(401);
  });

  it("returns 404 when product is not in the household", async () => {
    setupChain([], []);

    const response = await PATCH(buildRequest({ categoryId: 2 }), buildParams("1"));
    expect(response.status).toBe(404);
  });

  it("updates the categoryId", async () => {
    const { updateChain } = setupChain(
      [{ id: 1, name: "Milk", unit: "L", categoryId: 1, householdId: "hh-1" }],
      [{ id: 1, name: "Milk", unit: "L", categoryId: 2, householdId: "hh-1" }]
    );

    const response = await PATCH(buildRequest({ categoryId: 2 }), buildParams("1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.categoryId).toBe(2);
    expect(updateChain.set).toHaveBeenCalledWith({ categoryId: 2 });
  });

  it("clears the categoryId when null is passed", async () => {
    const { updateChain } = setupChain(
      [{ id: 1, name: "Milk", unit: "L", categoryId: 1, householdId: "hh-1" }],
      [{ id: 1, name: "Milk", unit: "L", categoryId: null, householdId: "hh-1" }]
    );

    const response = await PATCH(buildRequest({ categoryId: null }), buildParams("1"));

    expect(response.status).toBe(200);
    expect(updateChain.set).toHaveBeenCalledWith({ categoryId: null });
  });

  it("returns the existing product when no fields are provided", async () => {
    const existing = { id: 1, name: "Milk", unit: "L", categoryId: 1, householdId: "hh-1" };
    setupChain([existing], []);

    const response = await PATCH(buildRequest({}), buildParams("1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(existing);
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});
