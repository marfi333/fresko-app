import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { closeMirrorDb, outbox, resetMirrorDbForTests } from "../db";
import { mutateOrEnqueue } from "../mutate-or-enqueue";

const setOnline = (value: boolean) => {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => value,
  });
};

beforeEach(async () => {
  await resetMirrorDbForTests();
  setOnline(true);
});

afterEach(async () => {
  await closeMirrorDb();
});

describe("mutateOrEnqueue", () => {
  it("calls the online fn and returns { kind: 'applied' } when online", async () => {
    const online = vi.fn().mockResolvedValue({ id: 42, name: "Milk" });

    const result = await mutateOrEnqueue({
      entity: "entries",
      op: "create",
      payload: { name: "Milk" },
      online,
    });

    expect(online).toHaveBeenCalledOnce();
    expect(result).toEqual({ kind: "applied", value: { id: 42, name: "Milk" } });
    expect(await outbox.peekAll()).toHaveLength(0);
  });

  it("skips the online fn and enqueues when offline", async () => {
    setOnline(false);
    const online = vi.fn().mockResolvedValue({ id: 99 });

    const result = await mutateOrEnqueue({
      entity: "entries",
      op: "create",
      payload: { name: "Eggs" },
      online,
    });

    expect(online).not.toHaveBeenCalled();
    expect(result.kind).toBe("enqueued");
    const queued = await outbox.peekAll();
    expect(queued).toHaveLength(1);
    expect(queued[0]?.payload).toEqual({ name: "Eggs" });
  });

  it("falls back to enqueue when fetch throws TypeError mid-request", async () => {
    const online = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await mutateOrEnqueue({
      entity: "entries",
      op: "create",
      payload: { name: "Bread" },
      online,
    });

    expect(result.kind).toBe("enqueued");
    expect(await outbox.peekAll()).toHaveLength(1);
  });

  it("rethrows non-network errors (e.g. validation 4xx)", async () => {
    const online = vi.fn().mockRejectedValue(new Error("Invalid compartment"));

    await expect(
      mutateOrEnqueue({
        entity: "entries",
        op: "create",
        payload: {},
        online,
      })
    ).rejects.toThrow("Invalid compartment");
    expect(await outbox.peekAll()).toHaveLength(0);
  });

  it("threads serverId for update/delete", async () => {
    setOnline(false);
    const online = vi.fn();

    await mutateOrEnqueue({
      entity: "shoppingItems",
      op: "delete",
      serverId: 7,
      payload: {},
      online,
    });

    const [row] = await outbox.peekAll();
    expect(row?.op).toBe("delete");
    expect(row?.serverId).toBe(7);
  });
});
