import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Household-agnostic cache of external barcode lookups (Open Food Facts,
 * UPCitemdb, …). One row per barcode. `notFound = 1` records a confirmed
 * miss so we don't re-hit the chain for known-unknown codes within the TTL.
 *
 * `categoriesTags` is a JSON-encoded string array.
 */
export const barcodeLookups = sqliteTable("barcode_lookups", {
  barcode: text("barcode").primaryKey(),
  /**
   * Free-form provider id (matches `ProductDataProvider.id`). Not constrained
   * by an enum so adding a new provider doesn't require a schema migration.
   * Existing rows for retired providers stay readable; the resolver simply
   * never asks for them again.
   */
  source: text("source"),
  name: text("name"),
  brands: text("brands"),
  categoriesTags: text("categories_tags"),
  quantity: text("quantity"),
  // Raw upstream payload (JSON-encoded). Stored verbatim so future code can
  // mine fields we don't currently normalize without re-fetching.
  rawResponse: text("raw_response", { mode: "json" }),
  notFound: integer("not_found", { mode: "boolean" }).notNull().default(false),
  fetchedAt: integer("fetched_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type BarcodeLookup = typeof barcodeLookups.$inferSelect;
export type NewBarcodeLookup = typeof barcodeLookups.$inferInsert;
