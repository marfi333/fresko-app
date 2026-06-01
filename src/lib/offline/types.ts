export type MirrorEntity = "entries" | "categories" | "shoppingItems";

export type MirrorRow = {
  id: string;
  updatedAt: number;
  [key: string]: unknown;
};

export type OutboxOp = "create" | "update" | "delete";

export type OutboxStatus = "pending" | "in_flight" | "failed";

export type OutboxRecord = {
  id: string;
  entity: MirrorEntity;
  op: OutboxOp;
  payload: Record<string, unknown>;
  clientTs: number;
  status: OutboxStatus;
  attempts: number;
  lastError?: string;
};

export type MetaRow = {
  key: string;
  value: unknown;
};
