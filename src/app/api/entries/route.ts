import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { entries, products } from "@/db/schema";
import { getRequestContext } from "@/lib/api-utils";

const VALID_COMPARTMENTS = ["pantry", "fridge", "freezer"] as const;

export async function GET(request: Request) {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const url = new URL(request.url);
  const compartment = url.searchParams.get("compartment");
  const categoryId = url.searchParams.get("categoryId");
  const productId = url.searchParams.get("productId");

  const conditions: ReturnType<typeof eq>[] = [eq(entries.householdId, ctx.householdId)];

  if (
    compartment &&
    VALID_COMPARTMENTS.includes(compartment as (typeof VALID_COMPARTMENTS)[number])
  ) {
    conditions.push(eq(entries.compartment, compartment as (typeof VALID_COMPARTMENTS)[number]));
  }

  if (productId) {
    conditions.push(eq(entries.productId, parseInt(productId, 10)));
  }

  if (categoryId) {
    conditions.push(eq(products.categoryId, parseInt(categoryId, 10)));
    const result = await ctx.db
      .select()
      .from(entries)
      .innerJoin(products, eq(entries.productId, products.id))
      .where(and(...conditions))
      .orderBy(entries.createdAt);
    return NextResponse.json(result);
  }

  const result = await ctx.db
    .select()
    .from(entries)
    .where(and(...conditions))
    .orderBy(entries.createdAt);

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const body = (await request.json()) as {
    productId?: number;
    quantity?: number;
    compartment?: string;
    expiryDate?: string;
  };

  if (!body.productId || !body.quantity || !body.compartment) {
    return NextResponse.json(
      { error: "productId, quantity, and compartment are required" },
      { status: 400 }
    );
  }

  if (!VALID_COMPARTMENTS.includes(body.compartment as (typeof VALID_COMPARTMENTS)[number])) {
    return NextResponse.json(
      { error: "Invalid compartment. Must be: pantry, fridge, or freezer" },
      { status: 400 }
    );
  }

  const [entry] = await ctx.db
    .insert(entries)
    .values({
      productId: body.productId,
      quantity: body.quantity,
      compartment: body.compartment as (typeof VALID_COMPARTMENTS)[number],
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      createdBy: ctx.userId,
      householdId: ctx.householdId,
    })
    .returning();

  return NextResponse.json(entry, { status: 201 });
}
