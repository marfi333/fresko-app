"use client";

import { useQuery } from "@tanstack/react-query";
import type { ProductHint } from "@/db/schema/product-hints";

export const useProductHints = (name: string) => {
  return useQuery<ProductHint[]>({
    queryKey: ["product-hints", name],
    queryFn: async () => {
      const res = await fetch(`/api/product-hints?name=${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error("Failed to fetch product hints");
      return res.json();
    },
    enabled: name.length >= 2,
  });
};
