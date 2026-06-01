import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { products } from "@/db/schema";
import { getRequestContext } from "@/lib/api-utils";

type RouteParams = { params: Promise<{ id: string }> };

export const PATCH = async (request: Request, { params }: RouteParams) => {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const productId = parseInt(id, 10);

  const [existing] = await ctx.db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.householdId, ctx.householdId)));

  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    categoryId?: number | null;
  };

  const updates: Record<string, unknown> = {};
  if (body.categoryId !== undefined) {
    updates.categoryId = body.categoryId;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(existing);
  }

  const [updated] = await ctx.db
    .update(products)
    .set(updates)
    .where(eq(products.id, productId))
    .returning();

  return NextResponse.json(updated);
};
