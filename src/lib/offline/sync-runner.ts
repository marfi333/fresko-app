import { mirror, outbox } from "./db";
import type { OutboxRecord } from "./types";

export type DrainResult = {
  drained: number;
  ok: number;
  skipped: number;
  gone: number;
  error: number;
  networkError?: boolean;
};

type ReplayResultRow = {
  id: string;
  status: "ok" | "skipped" | "gone" | "error";
  reason?: string;
};

const REPLAY_ENDPOINT = "/api/sync/replay";

let inFlight: Promise<DrainResult> | null = null;

const emptyResult = (): DrainResult => ({
  drained: 0,
  ok: 0,
  skipped: 0,
  gone: 0,
  error: 0,
});

const buildReplayItem = (record: OutboxRecord) => ({
  id: record.id,
  entity: record.entity,
  op: record.op,
  serverId: record.serverId,
  payload: record.payload,
  clientTs: record.clientTs,
  tempId: record.tempId,
});

const applyResult = async (record: OutboxRecord, result: ReplayResultRow): Promise<void> => {
  if (result.status === "ok" || result.status === "skipped") {
    await outbox.ack(record.id);
    return;
  }

  if (result.status === "gone") {
    if (record.mirrorId) await mirror.del(record.entity, record.mirrorId);
    await outbox.ack(record.id);
    return;
  }

  // error
  await outbox.markFailed(record.id, result.reason ?? "unknown error");
};

const runDrain = async (): Promise<DrainResult> => {
  const queue = await outbox.peekAll();
  if (queue.length === 0) return emptyResult();

  const items = queue.map(buildReplayItem);

  let response: Response;
  try {
    response = await fetch(REPLAY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
      credentials: "same-origin",
    });
  } catch {
    return { ...emptyResult(), networkError: true };
  }

  if (!response.ok) {
    return { ...emptyResult(), networkError: true };
  }

  const body = (await response.json()) as { results?: ReplayResultRow[] };
  const results = body.results ?? [];
  const tally = emptyResult();
  const byId = new Map<string, ReplayResultRow>();
  for (const r of results) byId.set(r.id, r);

  for (const record of queue) {
    const result = byId.get(record.id);
    if (!result) {
      // Server didn't return a status for this item — treat as transient error.
      await outbox.markFailed(record.id, "no result returned by server");
      tally.error += 1;
      continue;
    }
    await applyResult(record, result);
    tally.drained += 1;
    if (result.status === "ok") tally.ok += 1;
    else if (result.status === "skipped") tally.skipped += 1;
    else if (result.status === "gone") tally.gone += 1;
    else tally.error += 1;
  }
  return tally;
};

/**
 * Drains the outbox via POST /api/sync/replay. Concurrent calls coalesce — if
 * a drain is already in-flight, the second call awaits the same result and
 * returns it.
 */
export const drainOutbox = async (): Promise<DrainResult> => {
  if (inFlight) return inFlight;
  inFlight = runDrain().finally(() => {
    inFlight = null;
  });
  return inFlight;
};
