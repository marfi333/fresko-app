export type MirrorEntity = "entries" | "categories" | "shoppingItems" | "products";

export type MirrorRow = {
  id: string;
  updatedAt: number;
  [key: string]: unknown;
};

export type OutboxOp = "create" | "update" | "delete" | "decrease";

export type OutboxStatus = "pending" | "in_flight" | "failed";

export type OutboxRecord = {
  id: string;
  entity: MirrorEntity;
  op: OutboxOp;
  serverId?: number;
  mirrorId?: string;
  payload: Record<string, unknown>;
  clientTs: number;
  status: OutboxStatus;
  attempts: number;
  lastError?: string;
  // Negative client-generated temp id for create ops. The replay endpoint
  // resolves sibling references (e.g. an entries:create payload.productId)
  // to the real id assigned during this batch.
  tempId?: number;
};

export type MetaRow = {
  key: string;
  value: unknown;
};
