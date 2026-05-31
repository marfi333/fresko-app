import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const productHints = sqliteTable("product_hints", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  namePattern: text("name_pattern").notNull(),
  suggestedUnit: text("suggested_unit", {
    enum: ["mL", "L", "g", "kg", "pieces", "packs"],
  }).notNull(),
  suggestedCategory: text("suggested_category").notNull(),
});

export type ProductHint = typeof productHints.$inferSelect;
export type NewProductHint = typeof productHints.$inferInsert;
