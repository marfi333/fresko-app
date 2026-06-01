import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { categories } from "@/db/schema";
import { getRequestContext } from "@/lib/api-utils";
import { decideLWW, extractClientTs } from "@/lib/sync/lww";

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

  const rawBody = (await request.json()) as Record<string, unknown>;
  const { clientTs, rest } = extractClientTs(rawBody);

  if (!existing) {
    if (clientTs !== undefined) {
      return NextResponse.json({ skipped: "gone" });
    }
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  if (decideLWW(clientTs, existing.updatedAt) === "stale") {
    return NextResponse.json({ skipped: "stale", current: existing });
  }

  const body = rest as { name?: string };

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
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  if (decideLWW(clientTs, existing.updatedAt) === "stale") {
    return NextResponse.json({ skipped: "stale", current: existing });
  }

  await ctx.db.delete(categories).where(eq(categories.id, categoryId));

  return NextResponse.json({ success: true });
};
