import { NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { entries, usageEvents } from "@/db/schema";
import { getRequestContext } from "@/lib/api-utils";

export async function POST(request: Request) {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const body = (await request.json()) as {
    productId?: number;
    amount?: number;
  };

  if (!body.productId || !body.amount || body.amount <= 0) {
    return NextResponse.json(
      { error: "productId and amount (> 0) are required" },
      { status: 400 }
    );
  }

  const productEntries = await ctx.db
    .select()
    .from(entries)
    .where(
      and(
        eq(entries.productId, body.productId),
        eq(entries.householdId, ctx.householdId)
      )
    )
    .orderBy(asc(entries.expiryDate));

  if (productEntries.length === 0) {
    return NextResponse.json(
      { error: "No entries found for this product" },
      { status: 404 }
    );
  }

  const totalAvailable = productEntries.reduce((sum, e) => sum + e.quantity, 0);
  if (body.amount > totalAvailable) {
    return NextResponse.json(
      { error: "Amount exceeds available quantity" },
      { status: 400 }
    );
  }

  let remaining = body.amount;

  for (const entry of productEntries) {
    if (remaining <= 0) break;

    const deduction = Math.min(remaining, entry.quantity);
    remaining -= deduction;

    await ctx.db.insert(usageEvents).values({
      entryId: entry.id,
      productId: body.productId,
      quantityDelta: -deduction,
      reason: "consumed",
      userId: ctx.userId,
      householdId: ctx.householdId,
    });

    if (deduction >= entry.quantity) {
      await ctx.db.delete(entries).where(eq(entries.id, entry.id));
    } else {
      await ctx.db
        .update(entries)
        .set({ quantity: entry.quantity - deduction })
        .where(eq(entries.id, entry.id));
    }
  }

  return NextResponse.json({ decreasedTotal: body.amount });
}
