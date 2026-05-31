"use client";

import { useQuery } from "@tanstack/react-query";
import type { Product } from "@/db/schema/products";

export const useProducts = (search?: string) => {
  return useQuery<Product[]>({
    queryKey: ["products", search ?? ""],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const url = `/api/products${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });
};
