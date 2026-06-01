import { type DBSchema, type IDBPDatabase, openDB } from "idb";

import type { MirrorEntity, MirrorRow, OutboxRecord } from "./types";

const DB_NAME = "fresko-offline";
const DB_VERSION = 2;

type MirrorSchema = DBSchema & {
  entries: {
    key: string;
    value: MirrorRow;
    indexes: { updatedAt: number };
  };
  categories: {
    key: string;
    value: MirrorRow;
    indexes: { updatedAt: number };
  };
  shoppingItems: {
    key: string;
    value: MirrorRow;
    indexes: { updatedAt: number };
  };
  products: {
    key: string;
    value: MirrorRow;
    indexes: { updatedAt: number };
  };
  outbox: {
    key: string;
    value: OutboxRecord;
    indexes: { clientTs: number; status: string };
  };
  meta: {
    key: string;
    value: { key: string; value: unknown };
  };
};

let dbPromise: Promise<IDBPDatabase<MirrorSchema>> | null = null;

const openMirror = () =>
  openDB<MirrorSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("entries")) {
        const store = db.createObjectStore("entries", { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
      }
      if (!db.objectStoreNames.contains("categories")) {
        const store = db.createObjectStore("categories", { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
      }
      if (!db.objectStoreNames.contains("shoppingItems")) {
        const store = db.createObjectStore("shoppingItems", { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
      }
      if (!db.objectStoreNames.contains("products")) {
        const store = db.createObjectStore("products", { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
      }
      if (!db.objectStoreNames.contains("outbox")) {
        const store = db.createObjectStore("outbox", { keyPath: "id" });
        store.createIndex("clientTs", "clientTs");
        store.createIndex("status", "status");
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    },
  });

export const getMirrorDb = () => {
  if (!dbPromise) dbPromise = openMirror();
  return dbPromise;
};

export const closeMirrorDb = async () => {
  if (!dbPromise) return;
  const db = await dbPromise;
  db.close();
  dbPromise = null;
};

export const resetMirrorDbForTests = async () => {
  await closeMirrorDb();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
};

export const mirror = {
  getAll: async (entity: MirrorEntity): Promise<MirrorRow[]> => {
    const db = await getMirrorDb();
    return db.getAll(entity);
  },
  get: async (entity: MirrorEntity, id: string): Promise<MirrorRow | undefined> => {
    const db = await getMirrorDb();
    return db.get(entity, id);
  },
  put: async (entity: MirrorEntity, row: MirrorRow): Promise<void> => {
    const db = await getMirrorDb();
    await db.put(entity, row);
  },
  del: async (entity: MirrorEntity, id: string): Promise<void> => {
    const db = await getMirrorDb();
    await db.delete(entity, id);
  },
};

type EnqueueInput = Pick<OutboxRecord, "id" | "entity" | "op" | "payload" | "clientTs">;

type OutboxListener = () => void;
const outboxListeners = new Set<OutboxListener>();

const notifyOutboxChange = () => {
  for (const l of outboxListeners) l();
};

export const subscribeOutbox = (listener: OutboxListener): (() => void) => {
  outboxListeners.add(listener);
  return () => {
    outboxListeners.delete(listener);
  };
};

export const outbox = {
  enqueue: async (record: EnqueueInput): Promise<void> => {
    const db = await getMirrorDb();
    const existing = await db.get("outbox", record.id);
    if (existing) return;
    await db.put("outbox", {
      ...record,
      status: "pending",
      attempts: 0,
    });
    notifyOutboxChange();
  },
  peekAll: async (): Promise<OutboxRecord[]> => {
    const db = await getMirrorDb();
    return db.getAllFromIndex("outbox", "clientTs");
  },
  ack: async (id: string): Promise<void> => {
    const db = await getMirrorDb();
    await db.delete("outbox", id);
    notifyOutboxChange();
  },
  markFailed: async (id: string, error: string): Promise<void> => {
    const db = await getMirrorDb();
    const row = await db.get("outbox", id);
    if (!row) return;
    await db.put("outbox", {
      ...row,
      status: "failed",
      attempts: row.attempts + 1,
      lastError: error,
    });
    notifyOutboxChange();
  },
};

/**
 * Internal-use notify for `enqueueMutation` (which writes the outbox via the
 * raw `tx` to keep the multi-store transaction atomic, bypassing the
 * `outbox.enqueue` notify path). Exported so `outbox.ts` can call it.
 */
export const notifyOutbox = notifyOutboxChange;
