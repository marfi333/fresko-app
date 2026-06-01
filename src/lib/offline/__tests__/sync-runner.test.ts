import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { closeMirrorDb, mirror, outbox, resetMirrorDbForTests } from "../db";
import { enqueueMutation } from "../outbox";
import { drainOutbox } from "../sync-runner";

const fetchMock = vi.fn();

beforeEach(async () => {
  await resetMirrorDbForTests();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(async () => {
  await closeMirrorDb();
  vi.unstubAllGlobals();
});

const replayResponse = (
  results: Array<{ id: string; status: "ok" | "skipped" | "gone" | "error"; reason?: string }>
) =>
  Promise.resolve(
    new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );

describe("drainOutbox", () => {
  it("returns { drained: 0 } when the outbox is empty without calling fetch", async () => {
    const result = await drainOutbox();
    expect(result.drained).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("acks ok results and removes them from the outbox", async () => {
    const a = await enqueueMutation({ entity: "entries", op: "create", payload: {} });
    const b = await enqueueMutation({ entity: "entries", op: "create", payload: {} });

    fetchMock.mockReturnValueOnce(
      replayResponse([
        { id: a.id, status: "ok" },
        { id: b.id, status: "ok" },
      ])
    );

    const result = await drainOutbox();
    expect(result.drained).toBe(2);
    expect(result.ok).toBe(2);
    expect(await outbox.peekAll()).toHaveLength(0);
  });

  it("acks 'skipped' (stale) results (the queued op is obsolete)", async () => {
    const a = await enqueueMutation({
      entity: "entries",
      op: "update",
      serverId: 1,
      payload: { quantity: 3 },
    });

    fetchMock.mockReturnValueOnce(
      replayResponse([{ id: a.id, status: "skipped", reason: "stale" }])
    );

    const result = await drainOutbox();
    expect(result.skipped).toBe(1);
    expect(await outbox.peekAll()).toHaveLength(0);
  });

  it("on 'gone', acks the outbox row AND removes the local mirror row", async () => {
    await mirror.put("entries", { id: "m-1", updatedAt: 1000, name: "X" });
    const a = await enqueueMutation({
      entity: "entries",
      op: "update",
      serverId: 999,
      payload: {},
      mirrorId: "m-1",
    });

    fetchMock.mockReturnValueOnce(replayResponse([{ id: a.id, status: "gone" }]));

    const result = await drainOutbox();
    expect(result.gone).toBe(1);
    expect(await outbox.peekAll()).toHaveLength(0);
    expect(await mirror.get("entries", "m-1")).toBeUndefined();
  });

  it("on 'error', keeps the row and marks it failed with the reason", async () => {
    const a = await enqueueMutation({ entity: "entries", op: "create", payload: {} });

    fetchMock.mockReturnValueOnce(replayResponse([{ id: a.id, status: "error", reason: "boom" }]));

    const result = await drainOutbox();
    expect(result.error).toBe(1);
    const queue = await outbox.peekAll();
    expect(queue).toHaveLength(1);
    expect(queue[0]?.status).toBe("failed");
    expect(queue[0]?.lastError).toBe("boom");
    expect(queue[0]?.attempts).toBe(1);
  });

  it("on network failure, keeps all rows and reports an error", async () => {
    await enqueueMutation({ entity: "entries", op: "create", payload: {} });
    await enqueueMutation({ entity: "entries", op: "create", payload: {} });

    fetchMock.mockImplementationOnce(() => Promise.reject(new TypeError("Failed to fetch")));

    const result = await drainOutbox();
    expect(result.networkError).toBe(true);
    expect(result.drained).toBe(0);
    expect(await outbox.peekAll()).toHaveLength(2);
  });

  it("sends rows to /api/sync/replay in FIFO order (by clientTs)", async () => {
    const earlier = await enqueueMutation({ entity: "entries", op: "create", payload: { n: 1 } });
    // Ensure deterministic time order — enqueueMutation uses Date.now()
    await new Promise((r) => setTimeout(r, 2));
    const later = await enqueueMutation({ entity: "entries", op: "create", payload: { n: 2 } });

    fetchMock.mockReturnValueOnce(
      replayResponse([
        { id: earlier.id, status: "ok" },
        { id: later.id, status: "ok" },
      ])
    );

    await drainOutbox();
    const sentBody = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(sentBody.items.map((it: { id: string }) => it.id)).toEqual([earlier.id, later.id]);
  });

  it("only one drain runs at a time (concurrent calls coalesce)", async () => {
    await enqueueMutation({ entity: "entries", op: "create", payload: {} });

    let resolveFetch: (v: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      })
    );

    const p1 = drainOutbox();
    const p2 = drainOutbox();

    // Resolve the in-flight call.
    resolveFetch(
      new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const [r1, r2] = await Promise.all([p1, p2]);
    // Only one fetch — second call returned a no-op result.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(r1.drained + r2.drained).toBeGreaterThanOrEqual(0);
  });

  it("returns { drained: 0, networkError: true } on non-OK HTTP", async () => {
    await enqueueMutation({ entity: "entries", op: "create", payload: {} });
    fetchMock.mockReturnValueOnce(Promise.resolve(new Response("oops", { status: 500 })));
    const result = await drainOutbox();
    expect(result.networkError).toBe(true);
    expect(await outbox.peekAll()).toHaveLength(1);
  });
});
