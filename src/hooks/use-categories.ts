"use client";

import { useQuery } from "@tanstack/react-query";
import type { Category } from "@/db/schema/categories";
import { mirror } from "@/lib/offline/db";
import type { MirrorRow } from "@/lib/offline/types";

const reviveCategory = (row: unknown): Category => {
  const r = row as Record<string, unknown>;
  const out: Record<string, unknown> = {
    ...r,
    id: typeof r.id === "string" ? Number(r.id) : (r.id as number),
  };
  if (r.createdAt !== undefined && r.createdAt !== null) {
    out.createdAt = new Date(r.createdAt as string | number | Date);
  }
  if (r.updatedAt !== undefined && r.updatedAt !== null) {
    out.updatedAt =
      typeof r.updatedAt === "number"
        ? new Date(r.updatedAt)
        : new Date(r.updatedAt as string | Date);
  }
  return out as unknown as Category;
};

const writeCategoriesToMirror = (categories: Category[]) => {
  for (const c of categories) {
    const row: MirrorRow = {
      ...(c as unknown as Record<string, unknown>),
      id: String(c.id),
      updatedAt: c.updatedAt instanceof Date ? c.updatedAt.getTime() : Date.now(),
    } as MirrorRow;
    void mirror.put("categories", row);
  }
};

export const useCategories = () => {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) throw new Error("Failed to fetch categories");
        const data = (await res.json()) as Category[];
        const revived = data.map(reviveCategory);
        writeCategoriesToMirror(revived);
        return revived;
      } catch (err) {
        if (err instanceof TypeError) {
          const rows = await mirror.getAll("categories");
          return rows.map(reviveCategory);
        }
        throw err;
      }
    },
  });
};
