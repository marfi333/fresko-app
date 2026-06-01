"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Product } from "@/db/schema/products";

type UpdateProductInput = {
  id: number;
  categoryId?: number | null;
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation<Product, Error, UpdateProductInput>({
    mutationFn: async ({ id, ...updates }) => {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to update product");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });
};
