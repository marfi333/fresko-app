import { productHints } from "./schema/product-hints";
import type { Database } from "./index";

const PRODUCT_HINTS = [
  { namePattern: "milk", suggestedUnit: "L", suggestedCategory: "Dairy" },
  { namePattern: "cheese", suggestedUnit: "g", suggestedCategory: "Dairy" },
  { namePattern: "yogurt", suggestedUnit: "g", suggestedCategory: "Dairy" },
  { namePattern: "butter", suggestedUnit: "g", suggestedCategory: "Dairy" },
  { namePattern: "chicken", suggestedUnit: "kg", suggestedCategory: "Meat & Fish" },
  { namePattern: "beef", suggestedUnit: "kg", suggestedCategory: "Meat & Fish" },
  { namePattern: "salmon", suggestedUnit: "g", suggestedCategory: "Meat & Fish" },
  { namePattern: "eggs", suggestedUnit: "pieces", suggestedCategory: "Dairy" },
  { namePattern: "bread", suggestedUnit: "pieces", suggestedCategory: "Bread & Bakery" },
  { namePattern: "rice", suggestedUnit: "kg", suggestedCategory: "Grains & Pasta" },
  { namePattern: "pasta", suggestedUnit: "g", suggestedCategory: "Grains & Pasta" },
  { namePattern: "apple", suggestedUnit: "pieces", suggestedCategory: "Fruits" },
  { namePattern: "banana", suggestedUnit: "pieces", suggestedCategory: "Fruits" },
  { namePattern: "tomato", suggestedUnit: "pieces", suggestedCategory: "Vegetables" },
  { namePattern: "potato", suggestedUnit: "kg", suggestedCategory: "Vegetables" },
  { namePattern: "onion", suggestedUnit: "pieces", suggestedCategory: "Vegetables" },
  { namePattern: "juice", suggestedUnit: "L", suggestedCategory: "Beverages" },
  { namePattern: "water", suggestedUnit: "L", suggestedCategory: "Beverages" },
  { namePattern: "coffee", suggestedUnit: "g", suggestedCategory: "Beverages" },
  { namePattern: "flour", suggestedUnit: "kg", suggestedCategory: "Grains & Pasta" },
  { namePattern: "sugar", suggestedUnit: "kg", suggestedCategory: "Condiments & Sauces" },
  { namePattern: "oil", suggestedUnit: "L", suggestedCategory: "Condiments & Sauces" },
  { namePattern: "ketchup", suggestedUnit: "mL", suggestedCategory: "Condiments & Sauces" },
  { namePattern: "chips", suggestedUnit: "g", suggestedCategory: "Snacks" },
  { namePattern: "ice cream", suggestedUnit: "mL", suggestedCategory: "Frozen Foods" },
  { namePattern: "pizza", suggestedUnit: "pieces", suggestedCategory: "Frozen Foods" },
  { namePattern: "canned", suggestedUnit: "pieces", suggestedCategory: "Canned Goods" },
] as const;

export async function seedProductHints(db: Database) {
  await db.insert(productHints).values(
    PRODUCT_HINTS.map((hint) => ({
      namePattern: hint.namePattern,
      suggestedUnit: hint.suggestedUnit,
      suggestedCategory: hint.suggestedCategory,
    }))
  );
}
