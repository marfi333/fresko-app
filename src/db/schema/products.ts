import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { categories } from "./categories";

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    unit: text("unit", {
      enum: ["mL", "L", "g", "kg", "pieces", "packs"],
    }).notNull(),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    householdId: text("household_id").notNull(),
    barcode: text("barcode"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    householdBarcodeUidx: uniqueIndex("products_household_barcode_uidx")
      .on(table.householdId, table.barcode)
      .where(sql`${table.barcode} IS NOT NULL`),
  })
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
