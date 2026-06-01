import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { closeMirrorDb, mirror, outbox, resetMirrorDbForTests } from "../db";
import { enqueueMutation } from "../outbox";

describe("enqueueMutation", () => {
  beforeEach(async () => {
    await resetMirrorDbForTests();
  });

  afterEach(async () => {
    await closeMirrorDb();
  });

  it("creates an outbox row with a ULID id, op, entity, payload, clientTs, and pending status", async () => {
    const result = await enqueueMutation({
      entity: "entries",
      op: "create",
      payload: { name: "Milk", quantity: 2, compartment: "fridge" },
    });

    expect(result.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/); // ULID Crockford base32
    expect(result.clientTs).toBeGreaterThan(0);
    expect(result.entity).toBe("entries");
    expect(result.op).toBe("create");

    const all = await outbox.peekAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      id: result.id,
      entity: "entries",
      op: "create",
      payload: { name: "Milk", quantity: 2, compartment: "fridge" },
      status: "pending",
      attempts: 0,
    });
  });

  it("writes mirror + outbox in a single transaction", async () => {
    // We can't directly inspect the transaction, but we can verify both
    // stores end up updated together when given a mirrorRow.
    const tempId = "temp-1";
    await enqueueMutation({
      entity: "categories",
      op: "create",
      payload: { name: "Dairy" },
      mirrorRow: { id: tempId, updatedAt: Date.now(), name: "Dairy" },
    });

    const mirrorRow = await mirror.get("categories", tempId);
    expect(mirrorRow).toMatchObject({ id: tempId, name: "Dairy" });
    expect(await outbox.peekAll()).toHaveLength(1);
  });

  it("supports update op with serverId", async () => {
    const result = await enqueueMutation({
      entity: "entries",
      op: "update",
      serverId: 42,
      payload: { quantity: 1 },
    });
    const [row] = await outbox.peekAll();
    expect(row?.serverId).toBe(42);
    expect(row?.op).toBe("update");
    expect(result.serverId).toBe(42);
  });

  it("supports delete op", async () => {
    await enqueueMutation({
      entity: "shoppingItems",
      op: "delete",
      serverId: 7,
      payload: {},
    });
    const [row] = await outbox.peekAll();
    expect(row?.op).toBe("delete");
    expect(row?.serverId).toBe(7);
  });

  it("delete with mirrorId removes the row from the mirror", async () => {
    await mirror.put("shoppingItems", { id: "s-1", updatedAt: 1000, name: "Yogurt" });
    expect(await mirror.get("shoppingItems", "s-1")).toBeDefined();

    await enqueueMutation({
      entity: "shoppingItems",
      op: "delete",
      serverId: 1,
      payload: {},
      mirrorId: "s-1",
    });

    expect(await mirror.get("shoppingItems", "s-1")).toBeUndefined();
    expect(await outbox.peekAll()).toHaveLength(1);
  });

  it("each call gets a unique ULID id", async () => {
    // Stub Math.random differently isn't required — ulid uses Date.now + random.
    const a = await enqueueMutation({ entity: "entries", op: "create", payload: {} });
    const b = await enqueueMutation({ entity: "entries", op: "create", payload: {} });
    expect(a.id).not.toBe(b.id);
  });

  it("clientTs reflects the time at enqueue", async () => {
    const before = Date.now();
    const result = await enqueueMutation({
      entity: "entries",
      op: "create",
      payload: {},
    });
    const after = Date.now();
    expect(result.clientTs).toBeGreaterThanOrEqual(before);
    expect(result.clientTs).toBeLessThanOrEqual(after);
  });

  it("calls onEnqueued listener if provided", async () => {
    const listener = vi.fn();
    const result = await enqueueMutation(
      { entity: "entries", op: "create", payload: {} },
      { onEnqueued: listener }
    );
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ id: result.id }));
  });
});
