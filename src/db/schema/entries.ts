import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { products } from "./products";

// NOTE: `updatedAt` uses `timestamp_ms` (milliseconds), unlike `createdAt` which
// uses seconds. The ms precision matches `Date.now()` on the client and is used
// for last-write-wins conflict resolution on offline replay. Server writes
// always set updatedAt = Date.now() (via `$defaultFn` on insert and `$onUpdate`
// on update); client mutations carry a clientTs (also ms).
export const entries = sqliteTable("entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  quantity: real("quantity").notNull(),
  compartment: text("compartment", {
    enum: ["pantry", "fridge", "freezer"],
  }).notNull(),
  expiryDate: integer("expiry_date", { mode: "timestamp" }),
  createdBy: text("created_by").notNull(),
  householdId: text("household_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
