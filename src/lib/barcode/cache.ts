import { eq } from "drizzle-orm";
import type { Database } from "@/db";
import { barcodeLookups } from "@/db/schema";

export const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type CachedHit = {
  kind: "hit";
  name: string;
  brands?: string;
  categoriesTags?: string[];
  quantity?: string;
  rawResponse?: unknown;
  /** Provider id that produced this hit (matches ProductDataProvider.id). */
  source: string;
  fresh: boolean;
};

export type CachedMiss = {
  kind: "miss";
  fresh: boolean;
};

export type CachedNone = { kind: "none" };

export type CacheRead = CachedHit | CachedMiss | CachedNone;

const isFresh = (fetchedAt: Date, now: Date): boolean =>
  now.getTime() - fetchedAt.getTime() < TTL_MS;

export const readCache = async (
  db: Database,
  barcode: string,
  now: Date = new Date()
): Promise<CacheRead> => {
  const [row] = await db
    .select()
    .from(barcodeLookups)
    .where(eq(barcodeLookups.barcode, barcode))
    .limit(1);

  if (!row) return { kind: "none" };

  const fresh = isFresh(row.fetchedAt, now);

  if (row.notFound) return { kind: "miss", fresh };

  return {
    kind: "hit",
    name: row.name ?? "",
    brands: row.brands ?? undefined,
    categoriesTags: row.categoriesTags ? (JSON.parse(row.categoriesTags) as string[]) : undefined,
    quantity: row.quantity ?? undefined,
    rawResponse: row.rawResponse ?? undefined,
    source: row.source ?? "unknown",
    fresh,
  };
};

export type CacheWriteHit = {
  barcode: string;
  /** Provider id (matches ProductDataProvider.id) — free-form. */
  source: string;
  name: string;
  brands?: string;
  categoriesTags?: string[];
  quantity?: string;
  rawResponse?: unknown;
};

export const writeCacheHit = async (db: Database, hit: CacheWriteHit, now: Date = new Date()) => {
  const values = {
    barcode: hit.barcode,
    source: hit.source,
    name: hit.name,
    brands: hit.brands ?? null,
    categoriesTags: hit.categoriesTags ? JSON.stringify(hit.categoriesTags) : null,
    quantity: hit.quantity ?? null,
    rawResponse: hit.rawResponse ?? null,
    notFound: false,
    fetchedAt: now,
  };
  await db
    .insert(barcodeLookups)
    .values(values)
    .onConflictDoUpdate({
      target: barcodeLookups.barcode,
      set: {
        source: values.source,
        name: values.name,
        brands: values.brands,
        categoriesTags: values.categoriesTags,
        quantity: values.quantity,
        rawResponse: values.rawResponse,
        notFound: values.notFound,
        fetchedAt: values.fetchedAt,
      },
    });
};

export const writeCacheMiss = async (
  db: Database,
  barcode: string,
  rawResponse: unknown = null,
  now: Date = new Date()
) => {
  const values = {
    barcode,
    source: null,
    name: null,
    brands: null,
    categoriesTags: null,
    quantity: null,
    rawResponse: rawResponse ?? null,
    notFound: true,
    fetchedAt: now,
  };
  await db
    .insert(barcodeLookups)
    .values(values)
    .onConflictDoUpdate({
      target: barcodeLookups.barcode,
      set: {
        source: values.source,
        name: values.name,
        brands: values.brands,
        categoriesTags: values.categoriesTags,
        quantity: values.quantity,
        rawResponse: values.rawResponse,
        notFound: values.notFound,
        fetchedAt: values.fetchedAt,
      },
    });
};
