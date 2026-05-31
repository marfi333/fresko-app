import type { Database } from "./index";
import { categories, DEFAULT_CATEGORIES } from "./schema/categories";

export async function seedDefaultCategories(db: Database, householdId: string) {
  const values = DEFAULT_CATEGORIES.map((name) => ({
    name,
    householdId,
  }));

  await db.insert(categories).values(values);
}
