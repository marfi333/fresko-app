"use client";

import { useQuery } from "@tanstack/react-query";
import type { Product } from "@/db/schema/products";
import { mirror } from "@/lib/offline/db";
import type { MirrorRow } from "@/lib/offline/types";

const reviveProduct = (row: unknown): Product => {
  const r = row as Record<string, unknown>;
  const out: Record<string, unknown> = {
    ...r,
    id: typeof r.id === "string" ? Number(r.id) : (r.id as number),
  };
  if (r.createdAt !== undefined && r.createdAt !== null) {
    out.createdAt = new Date(r.createdAt as string | number | Date);
  }
  return out as unknown as Product;
};

const writeProductsToMirror = (productRows: Product[]) => {
  for (const p of productRows) {
    // Products has no updatedAt column; use createdAt as the mirror ts.
    const ts = p.createdAt instanceof Date ? p.createdAt.getTime() : Date.now();
    const row: MirrorRow = {
      ...(p as unknown as Record<string, unknown>),
      id: String(p.id),
      updatedAt: ts,
    } as MirrorRow;
    void mirror.put("products", row);
  }
};

const readProductsFromMirror = async (search?: string): Promise<Product[]> => {
  const rows = await mirror.getAll("products");
  const all = rows.map(reviveProduct);
  if (!search) return all;
  const q = search.toLowerCase();
  return all.filter((p) => p.name.toLowerCase().includes(q));
};

export const useProducts = (search?: string) => {
  return useQuery<Product[]>({
    queryKey: ["products", search ?? ""],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const url = `/api/products${params.toString() ? `?${params}` : ""}`;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch products");
        const data = (await res.json()) as Product[];
        const revived = data.map(reviveProduct);
        writeProductsToMirror(revived);
        return revived;
      } catch (err) {
        if (err instanceof TypeError) return readProductsFromMirror(search);
        throw err;
      }
    },
  });
};
