import { and, desc, eq, max, notExists, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { entries, products, shoppingItems, usageEvents } from "@/db/schema";
import { getRequestContext } from "@/lib/api-utils";

export const GET = async (request: Request) => {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const suggestions = await ctx.db
    .select({
      productId: products.id,
      name: products.name,
      unit: products.unit,
      lastUsedAt: max(usageEvents.timestamp),
    })
    .from(products)
    .innerJoin(
      usageEvents,
      and(eq(usageEvents.productId, products.id), eq(usageEvents.householdId, ctx.householdId))
    )
    .where(
      and(
        eq(products.householdId, ctx.householdId),
        // No stock: either zero entries rows, or sum of quantity = 0
        or(
          notExists(
            ctx.db
              .select({ one: sql`1` })
              .from(entries)
              .where(
                and(eq(entries.householdId, ctx.householdId), eq(entries.productId, products.id))
              )
          ),
          sql`(select coalesce(sum(${entries.quantity}), 0) from ${entries}
               where ${entries.householdId} = ${ctx.householdId}
                 and ${entries.productId} = ${products.id}) = 0`
        ),
        // Not already on active shopping list
        notExists(
          ctx.db
            .select({ one: sql`1` })
            .from(shoppingItems)
            .where(
              and(
                eq(shoppingItems.householdId, ctx.householdId),
                eq(shoppingItems.productId, products.id),
                eq(shoppingItems.purchased, false)
              )
            )
        )
      )
    )
    .groupBy(products.id, products.name, products.unit)
    .orderBy(desc(max(usageEvents.timestamp)))
    .limit(10);

  return NextResponse.json({ suggestions });
};
