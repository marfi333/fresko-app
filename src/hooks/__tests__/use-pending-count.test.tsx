import "fake-indexeddb/auto";

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { closeMirrorDb, outbox, resetMirrorDbForTests } from "@/lib/offline/db";
import { enqueueMutation } from "@/lib/offline/outbox";

import { usePendingCount } from "../use-pending-count";

describe("usePendingCount", () => {
  beforeEach(async () => {
    await resetMirrorDbForTests();
  });

  afterEach(async () => {
    await closeMirrorDb();
  });

  it("starts at zero and reflects newly enqueued items", async () => {
    const { result } = renderHook(() => usePendingCount());
    await waitFor(() => expect(result.current.count).toBe(0));

    await act(async () => {
      await enqueueMutation({ entity: "entries", op: "create", payload: {} });
    });

    await waitFor(() => expect(result.current.count).toBe(1));
    expect(result.current.failed).toBe(0);
  });

  it("decrements after ack", async () => {
    const { result } = renderHook(() => usePendingCount());
    let id = "";
    await act(async () => {
      const rec = await enqueueMutation({ entity: "entries", op: "create", payload: {} });
      id = rec.id;
    });
    await waitFor(() => expect(result.current.count).toBe(1));

    await act(async () => {
      await outbox.ack(id);
    });
    await waitFor(() => expect(result.current.count).toBe(0));
  });

  it("counts failed rows separately", async () => {
    const { result } = renderHook(() => usePendingCount());
    let id = "";
    await act(async () => {
      const rec = await enqueueMutation({ entity: "entries", op: "create", payload: {} });
      id = rec.id;
    });
    await waitFor(() => expect(result.current.count).toBe(1));

    await act(async () => {
      await outbox.markFailed(id, "boom");
    });
    await waitFor(() => expect(result.current.failed).toBe(1));
    // Total count still includes the failed row.
    expect(result.current.count).toBe(1);
  });
});
