import { and, asc, eq } from "drizzle-orm";

import { categories, entries, products, shoppingItems, usageEvents } from "@/db/schema";
import { decideLWW } from "./lww";

export type ReplayEntity = "entries" | "categories" | "shoppingItems" | "products";
export type ReplayOp = "create" | "update" | "delete" | "decrease";

export type ReplayItem = {
  id: string;
  entity: ReplayEntity;
  op: ReplayOp;
  serverId?: number;
  payload: Record<string, unknown>;
  clientTs: number;
  // Optional: client-generated negative id used as a placeholder. When present
  // and a sibling item references it (e.g. entries:create whose payload.productId
  // is this number), the server resolves it to the real id assigned during this
  // batch replay.
  tempId?: number;
};

export type ReplayStatus = "ok" | "skipped" | "gone" | "error";

export type ReplayResult = {
  id: string;
  status: ReplayStatus;
  reason?: string;
  row?: unknown;
  // When a create assigned a real id, expose it here so client-side code can
  // resolve subsequent refs.
  serverId?: number;
};

// `db` is intentionally loose here: the real type is the Drizzle DB returned
// by `getRequestContext`, which is a union of many table-specific builders.
// Spelling it precisely would require importing the full Drizzle internal
// types; this surface is only used inside this module so a loose type is fine.
type ReplayCtx = {
  // biome-ignore lint/suspicious/noExplicitAny: see comment above
  db: any;
  householdId: string;
  userId: string;
};

const VALID_COMPARTMENTS = ["pantry", "fridge", "freezer"] as const;

const tableFor = (entity: ReplayEntity) => {
  switch (entity) {
    case "entries":
      return entries;
    case "categories":
      return categories;
    case "shoppingItems":
      return shoppingItems;
    case "products":
      return products;
  }
};

// Resolves negative client-generated temp ids to the real server ids that this
// batch's prior creates assigned. Returns the original id unchanged for
// non-temp values.
const resolveTempId = (
  raw: number | null | undefined,
  tempIdMap: Map<number, number>
): number | null | undefined => {
  if (raw === null || raw === undefined) return raw;
  if (raw >= 0) return raw;
  const real = tempIdMap.get(raw);
  return real ?? raw;
};

const replayCreate = async (
  ctx: ReplayCtx,
  item: ReplayItem,
  tempIdMap: Map<number, number>
): Promise<ReplayResult> => {
  const { entity, payload, id, tempId } = item;

  if (entity === "entries") {
    const rawProductId = payload.productId as number | undefined;
    const productId = resolveTempId(rawProductId, tempIdMap);
    const quantity = payload.quantity as number | undefined;
    const compartment = payload.compartment as string | undefined;
    if (!productId || productId < 0 || !quantity || !compartment) {
      return {
        id,
        status: "error",
        reason: "missing required fields or unresolved temp productId",
      };
    }
    if (!VALID_COMPARTMENTS.includes(compartment as (typeof VALID_COMPARTMENTS)[number])) {
      return { id, status: "error", reason: "invalid compartment" };
    }
    const [row] = await ctx.db
      .insert(entries)
      .values({
        productId,
        quantity,
        compartment: compartment as (typeof VALID_COMPARTMENTS)[number],
        expiryDate: payload.expiryDate ? new Date(payload.expiryDate as string) : null,
        createdBy: ctx.userId,
        householdId: ctx.householdId,
      })
      .returning();
    return { id, status: "ok", row, serverId: row.id };
  }

  if (entity === "products") {
    const name = (payload.name as string | undefined)?.trim();
    const unit = payload.unit as string | undefined;
    if (!name || !unit) return { id, status: "error", reason: "name and unit required" };
    const rawCategoryId = payload.categoryId as number | null | undefined;
    const categoryId = resolveTempId(rawCategoryId, tempIdMap);
    const [row] = await ctx.db
      .insert(products)
      .values({
        name,
        unit: unit as "mL" | "L" | "g" | "kg" | "pieces" | "packs",
        categoryId: categoryId && categoryId >= 0 ? categoryId : null,
        householdId: ctx.householdId,
        barcode: (payload.barcode as string | null | undefined) ?? null,
      })
      .returning();
    if (tempId !== undefined) tempIdMap.set(tempId, row.id);
    return { id, status: "ok", row, serverId: row.id };
  }

  if (entity === "categories") {
    const name = payload.name as string | undefined;
    if (!name) return { id, status: "error", reason: "name required" };
    const [row] = await ctx.db
      .insert(categories)
      .values({ name, householdId: ctx.householdId })
      .returning();
    if (tempId !== undefined) tempIdMap.set(tempId, row.id);
    return { id, status: "ok", row, serverId: row.id };
  }

  // shoppingItems
  const name = (payload.name as string | undefined)?.trim();
  if (!name) return { id, status: "error", reason: "name required" };
  const rawProductId = payload.productId as number | null | undefined;
  const productId = resolveTempId(rawProductId, tempIdMap);
  const [row] = await ctx.db
    .insert(shoppingItems)
    .values({
      householdId: ctx.householdId,
      productId: productId && productId >= 0 ? productId : null,
      name,
      quantity: (payload.quantity as number | null) ?? null,
      unit: (payload.unit as string | null) ?? null,
      createdBy: ctx.userId,
    })
    .returning();
  return { id, status: "ok", row, serverId: row.id };
};

const replayUpdate = async (ctx: ReplayCtx, item: ReplayItem): Promise<ReplayResult> => {
  const { entity, payload, clientTs, serverId, id } = item;
  if (!serverId) return { id, status: "error", reason: "serverId required for update" };

  const table = tableFor(entity);
  const [existing] = await ctx.db
    .select()
    .from(table)
    .where(and(eq(table.id, serverId), eq(table.householdId, ctx.householdId)));

  if (!existing) return { id, status: "gone" };
  if (decideLWW(clientTs, existing.updatedAt) === "stale") {
    return { id, status: "skipped", reason: "stale", row: existing };
  }

  // Strip server-managed columns from payload before passing to .set()
  const {
    id: _id,
    householdId: _hh,
    createdAt: _ca,
    updatedAt: _ua,
    ...updates
  } = payload as Record<string, unknown>;
  if (
    entity === "entries" &&
    updates.expiryDate !== undefined &&
    typeof updates.expiryDate === "string"
  ) {
    updates.expiryDate = new Date(updates.expiryDate);
  }
  if (entity === "shoppingItems" && updates.purchased !== undefined) {
    updates.purchasedAt = updates.purchased ? new Date() : null;
  }

  const [row] = await ctx.db.update(table).set(updates).where(eq(table.id, serverId)).returning();
  return { id, status: "ok", row };
};

const replayDelete = async (ctx: ReplayCtx, item: ReplayItem): Promise<ReplayResult> => {
  const { entity, clientTs, serverId, id } = item;
  if (!serverId) return { id, status: "error", reason: "serverId required for delete" };

  const table = tableFor(entity);
  const [existing] = await ctx.db
    .select()
    .from(table)
    .where(and(eq(table.id, serverId), eq(table.householdId, ctx.householdId)));

  if (!existing) return { id, status: "gone" };
  if (decideLWW(clientTs, existing.updatedAt) === "stale") {
    return { id, status: "skipped", reason: "stale", row: existing };
  }

  await ctx.db.delete(table).where(eq(table.id, serverId));
  return { id, status: "ok" };
};

const replayDecrease = async (ctx: ReplayCtx, item: ReplayItem): Promise<ReplayResult> => {
  const { entity, payload, id } = item;
  if (entity !== "entries") {
    return { id, status: "error", reason: "decrease only valid on entries" };
  }
  const productId = payload.productId as number | undefined;
  const amount = payload.amount as number | undefined;
  if (!productId || !amount || amount <= 0) {
    return { id, status: "error", reason: "productId and amount (> 0) required" };
  }

  // Decrease is best-effort: if the user has less inventory now than they did
  // when they queued the op, surface as 'skipped' (no error, just out of sync
  // — the server's truth wins).
  const productEntries = await ctx.db
    .select()
    .from(entries)
    .where(and(eq(entries.productId, productId), eq(entries.householdId, ctx.householdId)))
    .orderBy(asc(entries.expiryDate));

  if (productEntries.length === 0) return { id, status: "gone" };

  const totalAvailable = productEntries.reduce(
    (sum: number, e: { quantity: number }) => sum + e.quantity,
    0
  );
  if (amount > totalAvailable) {
    return { id, status: "skipped", reason: "insufficient quantity at replay time" };
  }

  let remaining = amount;
  for (const entry of productEntries) {
    if (remaining <= 0) break;
    const deduction = Math.min(remaining, entry.quantity);
    remaining -= deduction;

    await ctx.db.insert(usageEvents).values({
      entryId: entry.id,
      productId,
      quantityDelta: -deduction,
      reason: "consumed",
      userId: ctx.userId,
      householdId: ctx.householdId,
    });

    if (deduction >= entry.quantity) {
      await ctx.db.delete(entries).where(eq(entries.id, entry.id));
    } else {
      await ctx.db
        .update(entries)
        .set({ quantity: entry.quantity - deduction })
        .where(eq(entries.id, entry.id));
    }
  }

  return { id, status: "ok" };
};

export const replayOne = async (
  ctx: ReplayCtx,
  item: ReplayItem,
  tempIdMap: Map<number, number>
): Promise<ReplayResult> => {
  try {
    if (item.op === "create") return await replayCreate(ctx, item, tempIdMap);
    if (item.op === "update") return await replayUpdate(ctx, item);
    if (item.op === "delete") return await replayDelete(ctx, item);
    if (item.op === "decrease") return await replayDecrease(ctx, item);
    return { id: item.id, status: "error", reason: "unknown op" };
  } catch (err) {
    return {
      id: item.id,
      status: "error",
      reason: err instanceof Error ? err.message : "unknown error",
    };
  }
};

export const replayBatch = async (ctx: ReplayCtx, items: ReplayItem[]): Promise<ReplayResult[]> => {
  const results: ReplayResult[] = [];
  // Shared across the batch so a `products:create` (with tempId) earlier in
  // the list resolves the negative productId on a later `entries:create`.
  const tempIdMap = new Map<number, number>();
  for (const item of items) {
    results.push(await replayOne(ctx, item, tempIdMap));
  }
  return results;
};
