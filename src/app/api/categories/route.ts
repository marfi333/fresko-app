import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { categories } from "@/db/schema";
import { getRequestContext } from "@/lib/api-utils";

export async function GET(request: Request) {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const result = await ctx.db
    .select()
    .from(categories)
    .where(eq(categories.householdId, ctx.householdId))
    .orderBy(categories.name);

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const body = (await request.json()) as { name?: string };

  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const [category] = await ctx.db
    .insert(categories)
    .values({
      name: body.name,
      householdId: ctx.householdId,
    })
    .returning();

  return NextResponse.json(category, { status: 201 });
}
