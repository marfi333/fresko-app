"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ShoppingItem } from "@/db/schema/shopping-items";

type ShoppingListResponse = {
  active: ShoppingItem[];
  purchased: ShoppingItem[];
};

type ShoppingSuggestion = {
  productId: number;
  name: string;
  unit: string;
  lastUsedAt: string;
};

type CreateShoppingItemInput = {
  name: string;
  productId?: number | null;
  quantity?: number | null;
  unit?: string | null;
};

type UpdateShoppingItemInput = {
  id: number;
  name?: string;
  quantity?: number | null;
  unit?: string | null;
  purchased?: boolean;
};

const SHOPPING_KEY = ["shopping"] as const;
const SUGGESTIONS_KEY = ["shopping", "suggestions"] as const;

export const useShoppingList = () =>
  useQuery<ShoppingListResponse>({
    queryKey: SHOPPING_KEY,
    queryFn: async () => {
      const res = await fetch("/api/shopping");
      if (!res.ok) throw new Error("Failed to fetch shopping list");
      return res.json();
    },
  });

export const useShoppingSuggestions = () =>
  useQuery<{ suggestions: ShoppingSuggestion[] }>({
    queryKey: SUGGESTIONS_KEY,
    queryFn: async () => {
      const res = await fetch("/api/shopping/suggestions");
      if (!res.ok) throw new Error("Failed to fetch suggestions");
      return res.json();
    },
  });

export const useCreateShoppingItem = () => {
  const queryClient = useQueryClient();

  return useMutation<ShoppingItem, Error, CreateShoppingItemInput>({
    mutationFn: async (input) => {
      const res = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to add item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_KEY });
      queryClient.invalidateQueries({ queryKey: SUGGESTIONS_KEY });
    },
  });
};

export const useUpdateShoppingItem = () => {
  const queryClient = useQueryClient();

  return useMutation<ShoppingItem, Error, UpdateShoppingItemInput>({
    mutationFn: async ({ id, ...updates }) => {
      const res = await fetch(`/api/shopping/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to update item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_KEY });
      queryClient.invalidateQueries({ queryKey: SUGGESTIONS_KEY });
    },
  });
};

export const useDeleteShoppingItem = () => {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/shopping/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to delete item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_KEY });
      queryClient.invalidateQueries({ queryKey: SUGGESTIONS_KEY });
    },
  });
};

export type { CreateShoppingItemInput, ShoppingListResponse, ShoppingSuggestion };
