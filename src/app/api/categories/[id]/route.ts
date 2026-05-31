import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { categories } from "@/db/schema";
import { getRequestContext } from "@/lib/api-utils";

type RouteParams = { params: Promise<{ id: string }> };

export const PATCH = async (request: Request, { params }: RouteParams) => {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const categoryId = parseInt(id, 10);

  const [existing] = await ctx.db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.householdId, ctx.householdId)));

  if (!existing) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const body = (await request.json()) as { name?: string };

  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const [updated] = await ctx.db
    .update(categories)
    .set({ name: body.name })
    .where(eq(categories.id, categoryId))
    .returning();

  return NextResponse.json(updated);
};

export const DELETE = async (request: Request, { params }: RouteParams) => {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const categoryId = parseInt(id, 10);

  const [existing] = await ctx.db
    .select()
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.householdId, ctx.householdId)));

  if (!existing) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  await ctx.db.delete(categories).where(eq(categories.id, categoryId));

  return NextResponse.json({ success: true });
};
