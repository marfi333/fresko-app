import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { shoppingItems } from "@/db/schema";
import { getRequestContext } from "@/lib/api-utils";
import { decideLWW, extractClientTs } from "@/lib/sync/lww";

type RouteParams = { params: Promise<{ id: string }> };

export const PATCH = async (request: Request, { params }: RouteParams) => {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const itemId = parseInt(id, 10);

  const [existing] = await ctx.db
    .select()
    .from(shoppingItems)
    .where(and(eq(shoppingItems.id, itemId), eq(shoppingItems.householdId, ctx.householdId)));

  const rawBody = (await request.json()) as Record<string, unknown>;
  const { clientTs, rest } = extractClientTs(rawBody);

  if (!existing) {
    if (clientTs !== undefined) {
      return NextResponse.json({ skipped: "gone" });
    }
    return NextResponse.json({ error: "Shopping item not found" }, { status: 404 });
  }

  if (decideLWW(clientTs, existing.updatedAt) === "stale") {
    return NextResponse.json({ skipped: "stale", current: existing });
  }

  const body = rest as {
    name?: string;
    quantity?: number | null;
    unit?: string | null;
    purchased?: boolean;
    productId?: number | null;
  };

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const trimmed = body.name.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    updates.name = trimmed;
  }
  if (body.quantity !== undefined) updates.quantity = body.quantity;
  if (body.unit !== undefined) updates.unit = body.unit;
  if (body.productId !== undefined) updates.productId = body.productId;
  if (body.purchased !== undefined) {
    updates.purchased = body.purchased;
    updates.purchasedAt = body.purchased ? new Date() : null;
  }

  const [updated] = await ctx.db
    .update(shoppingItems)
    .set(updates)
    .where(eq(shoppingItems.id, itemId))
    .returning();

  return NextResponse.json(updated);
};

export const DELETE = async (request: Request, { params }: RouteParams) => {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const itemId = parseInt(id, 10);

  const [existing] = await ctx.db
    .select()
    .from(shoppingItems)
    .where(and(eq(shoppingItems.id, itemId), eq(shoppingItems.householdId, ctx.householdId)));

  let clientTs: number | undefined;
  try {
    const rawBody = (await request.json()) as Record<string, unknown>;
    ({ clientTs } = extractClientTs(rawBody));
  } catch {
    clientTs = undefined;
  }

  if (!existing) {
    if (clientTs !== undefined) {
      return NextResponse.json({ skipped: "gone" });
    }
    return NextResponse.json({ error: "Shopping item not found" }, { status: 404 });
  }

  if (decideLWW(clientTs, existing.updatedAt) === "stale") {
    return NextResponse.json({ skipped: "stale", current: existing });
  }

  await ctx.db.delete(shoppingItems).where(eq(shoppingItems.id, itemId));

  return NextResponse.json({ success: true });
};
