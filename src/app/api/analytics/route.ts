import { and, desc, eq, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { products, usageEvents } from "@/db/schema";
import { fillBuckets, parseRange, VALID_RANGES } from "@/lib/analytics/range";
import { getRequestContext } from "@/lib/api-utils";

type TrendRow = { bucket: string; total: number };
type TopRow = { productId: number; name: string; total: number; unit: string | null };
type WasteRow = { reason: "consumed" | "expired" | "discarded" | "corrected"; count: number };

const bucketSqlExpression = (granularity: "day" | "week" | "month") => {
  // usageEvents.timestamp is `mode: 'timestamp'` → seconds since epoch.
  // strftime('…', ts, 'unixepoch') already expects seconds, so use the raw column.
  const ts = sql`${usageEvents.timestamp}`;
  switch (granularity) {
    case "day":
      return sql<string>`strftime('%Y-%m-%d', ${ts}, 'unixepoch')`;
    case "week":
      // ISO 8601 week-year + week, matching JS-side isoWeek() in src/lib/analytics/range.ts.
      // SQLite's %W is week-of-year (Mon start) which does NOT match ISO weeks.
      return sql<string>`strftime('%G-W%V', ${ts}, 'unixepoch')`;
    case "month":
      return sql<string>`strftime('%Y-%m', ${ts}, 'unixepoch')`;
  }
};

export const GET = async (request: Request) => {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const url = new URL(request.url);
  const rawRange = url.searchParams.get("range");
  if (rawRange && !(VALID_RANGES as readonly string[]).includes(rawRange)) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }
  const categoryIdParam = url.searchParams.get("categoryId");
  const categoryId = categoryIdParam ? Number.parseInt(categoryIdParam, 10) : null;

  const now = new Date();
  const range = parseRange(rawRange, now);

  const baseConditions = [
    eq(usageEvents.householdId, ctx.householdId),
    gte(usageEvents.timestamp, range.since),
  ];

  // ── Trend ────────────────────────────────────────────────────────────────
  const bucketExpr = bucketSqlExpression(range.granularity);
  const trendConditions = [...baseConditions, eq(usageEvents.reason, "consumed")];
  let trendRows: { bucket: string; total: number }[] = [];

  if (categoryId !== null) {
    trendRows = (await ctx.db
      .select({
        bucket: bucketExpr,
        total: sql<number>`coalesce(sum(${usageEvents.quantityDelta}), 0) * -1`,
      })
      .from(usageEvents)
      .innerJoin(products, eq(products.id, usageEvents.productId))
      .where(and(...trendConditions, eq(products.categoryId, categoryId)))
      .groupBy(bucketExpr)) as { bucket: string; total: number }[];
  } else {
    trendRows = (await ctx.db
      .select({
        bucket: bucketExpr,
        total: sql<number>`coalesce(sum(${usageEvents.quantityDelta}), 0) * -1`,
      })
      .from(usageEvents)
      .where(and(...trendConditions))
      .groupBy(bucketExpr)) as { bucket: string; total: number }[];
  }

  const partial = new Map<string, number>(trendRows.map((r) => [r.bucket, Number(r.total) || 0]));
  const trend: TrendRow[] = fillBuckets(partial, range, now);

  // ── Top items ────────────────────────────────────────────────────────────
  const topRowsRaw = (await ctx.db
    .select({
      productId: products.id,
      name: products.name,
      total: sql<number>`coalesce(sum(${usageEvents.quantityDelta}), 0) * -1`,
      unit: products.unit,
    })
    .from(usageEvents)
    .innerJoin(products, eq(products.id, usageEvents.productId))
    .where(and(...baseConditions, eq(usageEvents.reason, "consumed")))
    .groupBy(products.id, products.name, products.unit)
    .orderBy(desc(sql<number>`sum(${usageEvents.quantityDelta}) * -1`))
    .limit(10)) as TopRow[];
  const top: TopRow[] = topRowsRaw.map((r) => ({
    ...r,
    total: Number(r.total) || 0,
  }));

  // ── Waste ────────────────────────────────────────────────────────────────
  const wasteRows = (await ctx.db
    .select({
      reason: usageEvents.reason,
      count: sql<number>`count(*)`,
    })
    .from(usageEvents)
    .where(and(...baseConditions))
    .groupBy(usageEvents.reason)) as WasteRow[];

  const wasteCounts = { consumed: 0, expired: 0, discarded: 0 };
  for (const row of wasteRows) {
    if (row.reason === "consumed" || row.reason === "expired" || row.reason === "discarded") {
      wasteCounts[row.reason] = Number(row.count) || 0;
    }
  }
  const totalEvents = wasteCounts.consumed + wasteCounts.expired + wasteCounts.discarded;
  const wastePct =
    totalEvents === 0
      ? 0
      : Math.round(((wasteCounts.expired + wasteCounts.discarded) / totalEvents) * 1000) / 10;

  return NextResponse.json({
    trend,
    top,
    waste: { ...wasteCounts, wastePct },
  });
};
