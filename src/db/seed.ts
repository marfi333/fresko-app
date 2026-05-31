import type { Database } from "./index";
import { categories, DEFAULT_CATEGORIES } from "./schema/categories";

export const seedDefaultCategories = async (db: Database, householdId: string) => {
  const values = DEFAULT_CATEGORIES.map((name) => ({
    name,
    householdId,
  }));

  await db.insert(categories).values(values);
};
