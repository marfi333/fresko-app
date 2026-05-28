import { NextResponse } from "next/server";
import { like } from "drizzle-orm";
import { productHints } from "@/db/schema";
import { getRequestContext } from "@/lib/api-utils";

export async function GET(request: Request) {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const url = new URL(request.url);
  const name = url.searchParams.get("name");

  if (!name) {
    return NextResponse.json(
      { error: "name query parameter is required" },
      { status: 400 }
    );
  }

  const hints = await ctx.db
    .select()
    .from(productHints)
    .where(like(productHints.namePattern, `%${name.toLowerCase()}%`))
    .limit(5);

  return NextResponse.json(hints);
}
