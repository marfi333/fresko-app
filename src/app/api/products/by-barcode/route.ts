import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { products } from "@/db/schema";
import { getRequestContext } from "@/lib/api-utils";

const BARCODE_PATTERN = /^(\d{8}|\d{12}|\d{13})$/;

export const GET = async (request: Request) => {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const code = new URL(request.url).searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }
  if (!BARCODE_PATTERN.test(code)) {
    return NextResponse.json({ error: "Invalid barcode" }, { status: 400 });
  }

  const [product] = await ctx.db
    .select()
    .from(products)
    .where(and(eq(products.householdId, ctx.householdId), eq(products.barcode, code)));

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(product);
};
