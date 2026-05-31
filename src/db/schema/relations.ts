import { relations } from "drizzle-orm";
import { categories } from "./categories";
import { entries } from "./entries";
import { products } from "./products";
import { shoppingItems } from "./shopping-items";
import { usageEvents } from "./usage-events";

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  entries: many(entries),
  usageEvents: many(usageEvents),
  shoppingItems: many(shoppingItems),
}));

export const shoppingItemsRelations = relations(shoppingItems, ({ one }) => ({
  product: one(products, {
    fields: [shoppingItems.productId],
    references: [products.id],
  }),
}));

export const entriesRelations = relations(entries, ({ one, many }) => ({
  product: one(products, {
    fields: [entries.productId],
    references: [products.id],
  }),
  usageEvents: many(usageEvents),
}));

export const usageEventsRelations = relations(usageEvents, ({ one }) => ({
  entry: one(entries, {
    fields: [usageEvents.entryId],
    references: [entries.id],
  }),
  product: one(products, {
    fields: [usageEvents.productId],
    references: [products.id],
  }),
}));
