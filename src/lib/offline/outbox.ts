import { ulid } from "ulid";

import { getMirrorDb, notifyOutbox } from "./db";
import type { MirrorEntity, MirrorRow, OutboxOp, OutboxRecord } from "./types";

export type MirrorOp = { kind: "put"; row: MirrorRow } | { kind: "del"; id: string };

export type EnqueueInput = {
  entity: MirrorEntity;
  op: OutboxOp;
  payload: Record<string, unknown>;
  serverId?: number;
  mirrorId?: string;
  mirrorRow?: MirrorRow;
  /** Multi-row mirror operations applied atomically with the outbox write. */
  extraMirrorOps?: MirrorOp[];
};

export type EnqueueOptions = {
  onEnqueued?: (record: OutboxRecord) => void;
};

/**
 * Writes a mutation to the IndexedDB outbox. When a mirrorRow is supplied, it
 * is upserted into the corresponding mirror store in the SAME IDB transaction;
 * delete ops with a mirrorId remove that row from the mirror in the same tx.
 *
 * Returns the persisted OutboxRecord (with generated ULID id and clientTs).
 */
export const enqueueMutation = async (
  input: EnqueueInput,
  options: EnqueueOptions = {}
): Promise<OutboxRecord> => {
  const db = await getMirrorDb();
  const record: OutboxRecord = {
    id: ulid(),
    entity: input.entity,
    op: input.op,
    serverId: input.serverId,
    mirrorId: input.mirrorId,
    payload: input.payload,
    clientTs: Date.now(),
    status: "pending",
    attempts: 0,
  };

  // Single multi-store transaction: mirror writes + outbox enqueue together.
  const stores = ["outbox", input.entity] as const;
  const tx = db.transaction(stores, "readwrite");

  await tx.objectStore("outbox").put(record);

  if (input.op === "delete" && input.mirrorId) {
    await tx.objectStore(input.entity).delete(input.mirrorId);
  } else if (input.mirrorRow) {
    await tx.objectStore(input.entity).put(input.mirrorRow);
  }

  if (input.extraMirrorOps && input.extraMirrorOps.length > 0) {
    const store = tx.objectStore(input.entity);
    for (const op of input.extraMirrorOps) {
      if (op.kind === "put") await store.put(op.row);
      else await store.delete(op.id);
    }
  }

  await tx.done;
  notifyOutbox();

  options.onEnqueued?.(record);
  return record;
};
