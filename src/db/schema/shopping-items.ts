import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { products } from "./products";

// NOTE: `updatedAt` uses `timestamp_ms` (ms) for LWW vs the client's Date.now();
// `createdAt`/`purchasedAt` stay in seconds for backwards compatibility.
export const shoppingItems = sqliteTable("shopping_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  householdId: text("household_id").notNull(),
  productId: integer("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  quantity: real("quantity"),
  unit: text("unit"),
  purchased: integer("purchased", { mode: "boolean" }).notNull().default(false),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  purchasedAt: integer("purchased_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export type ShoppingItem = typeof shoppingItems.$inferSelect;
export type NewShoppingItem = typeof shoppingItems.$inferInsert;
