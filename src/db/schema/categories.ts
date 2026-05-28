import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  householdId: text("household_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export const DEFAULT_CATEGORIES = [
  "Dairy",
  "Meat & Fish",
  "Fruits",
  "Vegetables",
  "Bread & Bakery",
  "Grains & Pasta",
  "Canned Goods",
  "Frozen Foods",
  "Snacks",
  "Beverages",
  "Condiments & Sauces",
  "Other",
] as const;
