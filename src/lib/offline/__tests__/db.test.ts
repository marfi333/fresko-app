import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { closeMirrorDb, getMirrorDb, mirror, outbox, resetMirrorDbForTests } from "../db";

const sampleEntry = (overrides: Partial<{ id: string; updatedAt: number; name: string }> = {}) => ({
  id: overrides.id ?? "e1",
  updatedAt: overrides.updatedAt ?? 1_000,
  name: overrides.name ?? "Milk",
});

describe("offline mirror db", () => {
  beforeEach(async () => {
    await resetMirrorDbForTests();
  });

  afterEach(async () => {
    await closeMirrorDb();
  });

  it("opens the database with the expected object stores", async () => {
    const db = await getMirrorDb();
    expect(db.objectStoreNames.contains("entries")).toBe(true);
    expect(db.objectStoreNames.contains("categories")).toBe(true);
    expect(db.objectStoreNames.contains("shoppingItems")).toBe(true);
    expect(db.objectStoreNames.contains("outbox")).toBe(true);
    expect(db.objectStoreNames.contains("meta")).toBe(true);
  });

  describe("mirror CRUD", () => {
    it("puts and gets a row", async () => {
      await mirror.put("entries", sampleEntry());
      const row = await mirror.get("entries", "e1");
      expect(row).toMatchObject({ id: "e1", name: "Milk", updatedAt: 1_000 });
    });

    it("getAll returns every row", async () => {
      await mirror.put("entries", sampleEntry({ id: "e1" }));
      await mirror.put("entries", sampleEntry({ id: "e2", name: "Eggs" }));
      const rows = await mirror.getAll("entries");
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.id).sort()).toEqual(["e1", "e2"]);
    });

    it("del removes a row", async () => {
      await mirror.put("entries", sampleEntry());
      await mirror.del("entries", "e1");
      const row = await mirror.get("entries", "e1");
      expect(row).toBeUndefined();
    });

    it("isolates rows across entities", async () => {
      await mirror.put("entries", sampleEntry({ id: "e1" }));
      await mirror.put("categories", { id: "c1", updatedAt: 0, name: "Dairy" });
      const entries = await mirror.getAll("entries");
      const categories = await mirror.getAll("categories");
      expect(entries).toHaveLength(1);
      expect(categories).toHaveLength(1);
    });
  });

  describe("outbox", () => {
    it("enqueue, peekAll, ack round-trip", async () => {
      await outbox.enqueue({
        id: "op1",
        entity: "entries",
        op: "create",
        payload: { name: "Milk" },
        clientTs: 1_000,
      });
      const all = await outbox.peekAll();
      expect(all).toHaveLength(1);
      expect(all[0]).toMatchObject({
        id: "op1",
        entity: "entries",
        op: "create",
        clientTs: 1_000,
        status: "pending",
        attempts: 0,
      });

      await outbox.ack("op1");
      expect(await outbox.peekAll()).toHaveLength(0);
    });

    it("preserves FIFO order by clientTs", async () => {
      await outbox.enqueue({
        id: "op2",
        entity: "entries",
        op: "create",
        payload: {},
        clientTs: 2_000,
      });
      await outbox.enqueue({
        id: "op1",
        entity: "entries",
        op: "create",
        payload: {},
        clientTs: 1_000,
      });
      const all = await outbox.peekAll();
      expect(all.map((r) => r.id)).toEqual(["op1", "op2"]);
    });

    it("markFailed increments attempts and records error", async () => {
      await outbox.enqueue({
        id: "op1",
        entity: "entries",
        op: "create",
        payload: {},
        clientTs: 1_000,
      });
      await outbox.markFailed("op1", "boom");
      const [row] = await outbox.peekAll();
      expect(row?.status).toBe("failed");
      expect(row?.attempts).toBe(1);
      expect(row?.lastError).toBe("boom");

      await outbox.markFailed("op1", "still broken");
      const [again] = await outbox.peekAll();
      expect(again?.attempts).toBe(2);
      expect(again?.lastError).toBe("still broken");
    });

    it("re-enqueueing the same id is idempotent (no duplicate row)", async () => {
      const record = {
        id: "op1",
        entity: "entries" as const,
        op: "create" as const,
        payload: {},
        clientTs: 1_000,
      };
      await outbox.enqueue(record);
      await outbox.enqueue(record);
      const all = await outbox.peekAll();
      expect(all).toHaveLength(1);
    });
  });
});
