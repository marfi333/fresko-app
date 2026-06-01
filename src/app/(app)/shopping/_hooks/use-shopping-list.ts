"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ShoppingItem } from "@/db/schema/shopping-items";
import { mirror } from "@/lib/offline/db";
import { mutateOrEnqueue } from "@/lib/offline/mutate-or-enqueue";
import type { MirrorRow } from "@/lib/offline/types";

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

const syntheticShoppingItem = (input: CreateShoppingItemInput): ShoppingItem => {
  const now = Date.now();
  return {
    id: -now,
    householdId: "offline",
    productId: input.productId ?? null,
    name: input.name,
    quantity: input.quantity ?? null,
    unit: input.unit ?? null,
    purchased: false,
    createdBy: "offline",
    createdAt: new Date(now),
    purchasedAt: null,
    updatedAt: new Date(now),
  };
};

export const useCreateShoppingItem = () => {
  const queryClient = useQueryClient();

  return useMutation<ShoppingItem, Error, CreateShoppingItemInput>({
    mutationFn: async (input) => {
      const synthetic = syntheticShoppingItem(input);
      const result = await mutateOrEnqueue<ShoppingItem>({
        entity: "shoppingItems",
        op: "create",
        payload: { ...input },
        mirrorRow: { ...synthetic, id: String(synthetic.id) } as unknown as MirrorRow,
        online: async () => {
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
      });
      return result.kind === "applied" ? result.value : synthetic;
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
      const mirrorId = String(id);
      const existing = await mirror.get("shoppingItems", mirrorId);
      const optimistic = existing
        ? ({ ...existing, ...updates, updatedAt: Date.now() } as MirrorRow)
        : undefined;

      const result = await mutateOrEnqueue<ShoppingItem>({
        entity: "shoppingItems",
        op: "update",
        serverId: id,
        payload: updates,
        mirrorRow: optimistic,
        online: async () => {
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
      });
      return result.kind === "applied" ? result.value : (optimistic as unknown as ShoppingItem);
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
      const result = await mutateOrEnqueue<{ success: boolean }>({
        entity: "shoppingItems",
        op: "delete",
        serverId: id,
        mirrorId: String(id),
        payload: {},
        online: async () => {
          const res = await fetch(`/api/shopping/${id}`, { method: "DELETE" });
          if (!res.ok) {
            const body = (await res.json()) as { error?: string };
            throw new Error(body.error ?? "Failed to delete item");
          }
          return res.json();
        },
      });
      return result.kind === "applied" ? result.value : { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHOPPING_KEY });
      queryClient.invalidateQueries({ queryKey: SUGGESTIONS_KEY });
    },
  });
};

export type { CreateShoppingItemInput, ShoppingListResponse, ShoppingSuggestion };
