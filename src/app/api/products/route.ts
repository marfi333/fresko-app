import { and, eq, like } from "drizzle-orm";
import { NextResponse } from "next/server";
import { products } from "@/db/schema";
import { getRequestContext } from "@/lib/api-utils";

const VALID_UNITS = ["mL", "L", "g", "kg", "pieces", "packs"] as const;

export async function GET(request: Request) {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const url = new URL(request.url);
  const search = url.searchParams.get("search");

  const conditions = [eq(products.householdId, ctx.householdId)];
  if (search) {
    conditions.push(like(products.name, `%${search}%`));
  }

  const result = await ctx.db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(products.name);

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const body = (await request.json()) as {
    name?: string;
    unit?: string;
    categoryId?: number;
  };

  if (!body.name || !body.unit) {
    return NextResponse.json({ error: "name and unit are required" }, { status: 400 });
  }

  if (!VALID_UNITS.includes(body.unit as (typeof VALID_UNITS)[number])) {
    return NextResponse.json({ error: "Invalid unit" }, { status: 400 });
  }

  const [product] = await ctx.db
    .insert(products)
    .values({
      name: body.name,
      unit: body.unit as (typeof VALID_UNITS)[number],
      categoryId: body.categoryId ?? null,
      householdId: ctx.householdId,
    })
    .returning();

  return NextResponse.json(product, { status: 201 });
}
