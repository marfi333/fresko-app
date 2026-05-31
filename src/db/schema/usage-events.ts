import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { entries } from "./entries";
import { products } from "./products";

export const usageEvents = sqliteTable("usage_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entryId: integer("entry_id").references(() => entries.id, {
    onDelete: "set null",
  }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  quantityDelta: real("quantity_delta").notNull(),
  reason: text("reason", {
    enum: ["consumed", "expired", "corrected", "discarded"],
  }).notNull(),
  userId: text("user_id").notNull(),
  householdId: text("household_id").notNull(),
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type UsageEvent = typeof usageEvents.$inferSelect;
export type NewUsageEvent = typeof usageEvents.$inferInsert;
