import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { entries, usageEvents } from "@/db/schema";
import { getRequestContext } from "@/lib/api-utils";

const VALID_COMPARTMENTS = ["pantry", "fridge", "freezer"] as const;

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const entryId = parseInt(id, 10);

  const [existing] = await ctx.db
    .select()
    .from(entries)
    .where(and(eq(entries.id, entryId), eq(entries.householdId, ctx.householdId)));

  if (!existing) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    quantity?: number;
    compartment?: string;
    expiryDate?: string | null;
  };

  const updates: Record<string, unknown> = {};
  if (body.quantity !== undefined) updates.quantity = body.quantity;
  if (body.compartment !== undefined) {
    if (!VALID_COMPARTMENTS.includes(body.compartment as (typeof VALID_COMPARTMENTS)[number])) {
      return NextResponse.json({ error: "Invalid compartment" }, { status: 400 });
    }
    updates.compartment = body.compartment;
  }
  if (body.expiryDate !== undefined) {
    updates.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
  }

  if (body.quantity !== undefined && body.quantity < existing.quantity) {
    await ctx.db.insert(usageEvents).values({
      entryId: existing.id,
      productId: existing.productId,
      quantityDelta: body.quantity - existing.quantity,
      reason: "corrected",
      userId: ctx.userId,
      householdId: ctx.householdId,
    });
  }

  const [updated] = await ctx.db
    .update(entries)
    .set(updates)
    .where(eq(entries.id, entryId))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const entryId = parseInt(id, 10);

  const [existing] = await ctx.db
    .select()
    .from(entries)
    .where(and(eq(entries.id, entryId), eq(entries.householdId, ctx.householdId)));

  if (!existing) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  await ctx.db.insert(usageEvents).values({
    entryId: existing.id,
    productId: existing.productId,
    quantityDelta: -existing.quantity,
    reason: "discarded",
    userId: ctx.userId,
    householdId: ctx.householdId,
  });

  await ctx.db.delete(entries).where(eq(entries.id, entryId));

  return NextResponse.json({ success: true });
}
