import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { products } from "./products";

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
});

export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
