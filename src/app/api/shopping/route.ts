import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { shoppingItems } from "@/db/schema";
import { getRequestContext } from "@/lib/api-utils";

export const GET = async (request: Request) => {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const active = await ctx.db
    .select()
    .from(shoppingItems)
    .where(and(eq(shoppingItems.householdId, ctx.householdId), eq(shoppingItems.purchased, false)))
    .orderBy(desc(shoppingItems.createdAt));

  const purchased = await ctx.db
    .select()
    .from(shoppingItems)
    .where(and(eq(shoppingItems.householdId, ctx.householdId), eq(shoppingItems.purchased, true)))
    .orderBy(desc(shoppingItems.purchasedAt));

  return NextResponse.json({ active, purchased });
};

export const POST = async (request: Request) => {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const body = (await request.json()) as {
    name?: string;
    productId?: number | null;
    quantity?: number | null;
    unit?: string | null;
  };

  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const [item] = await ctx.db
    .insert(shoppingItems)
    .values({
      householdId: ctx.householdId,
      productId: body.productId ?? null,
      name,
      quantity: body.quantity ?? null,
      unit: body.unit ?? null,
      createdBy: ctx.userId,
    })
    .returning();

  return NextResponse.json(item, { status: 201 });
};
