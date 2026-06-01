"use client";

import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

const reviveShoppingItem = (row: unknown): ShoppingItem => {
  const r = row as Record<string, unknown>;
  const out: Record<string, unknown> = {
    ...r,
    id: typeof r.id === "string" ? Number(r.id) : (r.id as number),
  };
  if (r.purchasedAt !== undefined) {
    out.purchasedAt = r.purchasedAt ? new Date(r.purchasedAt as string | number | Date) : null;
  }
  if (r.createdAt !== undefined && r.createdAt !== null) {
    out.createdAt = new Date(r.createdAt as string | number | Date);
  }
  if (r.updatedAt !== undefined && r.updatedAt !== null) {
    out.updatedAt =
      typeof r.updatedAt === "number"
        ? new Date(r.updatedAt)
        : new Date(r.updatedAt as string | Date);
  }
  return out as unknown as ShoppingItem;
};

const writeShoppingToMirror = (items: ShoppingItem[]) => {
  for (const i of items) {
    const row: MirrorRow = {
      ...(i as unknown as Record<string, unknown>),
      id: String(i.id),
      updatedAt: i.updatedAt instanceof Date ? i.updatedAt.getTime() : Date.now(),
    } as MirrorRow;
    void mirror.put("shoppingItems", row);
  }
};

export const useShoppingList = () =>
  useQuery<ShoppingListResponse>({
    queryKey: SHOPPING_KEY,
    queryFn: async () => {
      try {
        const res = await fetch("/api/shopping");
        if (!res.ok) throw new Error("Failed to fetch shopping list");
        const data = (await res.json()) as ShoppingListResponse;
        const all = [...data.active, ...data.purchased].map(reviveShoppingItem);
        writeShoppingToMirror(all);
        return {
          active: data.active.map(reviveShoppingItem),
          purchased: data.purchased.map(reviveShoppingItem),
        };
      } catch (err) {
        if (!(err instanceof TypeError)) throw err;
        const rows = await mirror.getAll("shoppingItems");
        const all = rows.map(reviveShoppingItem);
        return {
          active: all.filter((i) => !i.purchased),
          purchased: all.filter((i) => i.purchased),
        };
      }
    },
  });

export const useShoppingSuggestions = () =>
  useQuery<{ suggestions: ShoppingSuggestion[] }>({
    queryKey: SUGGESTIONS_KEY,
    queryFn: async () => {
      try {
        const res = await fetch("/api/shopping/suggestions");
        if (!res.ok) throw new Error("Failed to fetch suggestions");
        return res.json();
      } catch (err) {
        if (err instanceof TypeError) return { suggestions: [] };
        throw err;
      }
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

type ShoppingMutationContext = { snapshot: ShoppingListResponse | undefined };

const snapshotShopping = async (
  queryClient: QueryClient
): Promise<ShoppingListResponse | undefined> => {
  await queryClient.cancelQueries({ queryKey: SHOPPING_KEY });
  return queryClient.getQueryData<ShoppingListResponse>(SHOPPING_KEY);
};

const restoreShopping = (queryClient: QueryClient, snap: ShoppingListResponse | undefined) => {
  queryClient.setQueryData(SHOPPING_KEY, snap);
};

const updateShoppingCache = (
  queryClient: QueryClient,
  updater: (prev: ShoppingListResponse) => ShoppingListResponse
) => {
  queryClient.setQueryData<ShoppingListResponse>(SHOPPING_KEY, (prev) => {
    if (!prev) return prev;
    return updater(prev);
  });
};

const shouldRefetchShopping = <T>(
  data: { kind: "applied"; value: T } | { kind: "enqueued"; clientTs: number } | undefined
) => data?.kind === "applied";

export const useCreateShoppingItem = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { kind: "applied"; value: ShoppingItem } | { kind: "enqueued"; clientTs: number },
    Error,
    CreateShoppingItemInput,
    ShoppingMutationContext
  >({
    mutationFn: (input) => {
      const synthetic = syntheticShoppingItem(input);
      return mutateOrEnqueue<ShoppingItem>({
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
    },
    onMutate: async (input) => {
      const snapshot = await snapshotShopping(queryClient);
      const synthetic = syntheticShoppingItem(input);
      updateShoppingCache(queryClient, (prev) => ({
        active: [...prev.active, synthetic],
        purchased: prev.purchased,
      }));
      return { snapshot };
    },
    onError: (_err, _input, context) => {
      if (context) restoreShopping(queryClient, context.snapshot);
    },
    onSuccess: (data) => {
      if (data.kind !== "applied") return;
      const real = data.value;
      updateShoppingCache(queryClient, (prev) => ({
        active: prev.active.map((i) => (i.id < 0 ? real : i)),
        purchased: prev.purchased,
      }));
    },
    onSettled: (data) => {
      if (shouldRefetchShopping(data)) {
        queryClient.invalidateQueries({ queryKey: SHOPPING_KEY });
        queryClient.invalidateQueries({ queryKey: SUGGESTIONS_KEY });
      }
    },
  });
};

export const useUpdateShoppingItem = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { kind: "applied"; value: ShoppingItem } | { kind: "enqueued"; clientTs: number },
    Error,
    UpdateShoppingItemInput,
    ShoppingMutationContext
  >({
    mutationFn: async ({ id, ...updates }) => {
      const mirrorId = String(id);
      const existing = await mirror.get("shoppingItems", mirrorId);
      const optimistic = existing
        ? ({ ...existing, ...updates, updatedAt: Date.now() } as MirrorRow)
        : undefined;

      return mutateOrEnqueue<ShoppingItem>({
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
    },
    onMutate: async ({ id, ...updates }) => {
      const snapshot = await snapshotShopping(queryClient);
      updateShoppingCache(queryClient, (prev) => {
        const apply = (i: ShoppingItem): ShoppingItem =>
          i.id === id ? ({ ...i, ...updates, updatedAt: new Date() } as ShoppingItem) : i;
        // If `purchased` flips, move the item between buckets.
        if (updates.purchased === undefined) {
          return {
            active: prev.active.map(apply),
            purchased: prev.purchased.map(apply),
          };
        }
        const all = [...prev.active.map(apply), ...prev.purchased.map(apply)];
        return {
          active: all.filter((i) => !i.purchased),
          purchased: all.filter((i) => i.purchased),
        };
      });
      return { snapshot };
    },
    onError: (_err, _input, context) => {
      if (context) restoreShopping(queryClient, context.snapshot);
    },
    onSettled: (data) => {
      if (shouldRefetchShopping(data)) {
        queryClient.invalidateQueries({ queryKey: SHOPPING_KEY });
        queryClient.invalidateQueries({ queryKey: SUGGESTIONS_KEY });
      }
    },
  });
};

export const useDeleteShoppingItem = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { kind: "applied"; value: { success: boolean } } | { kind: "enqueued"; clientTs: number },
    Error,
    number,
    ShoppingMutationContext
  >({
    mutationFn: (id) =>
      mutateOrEnqueue<{ success: boolean }>({
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
      }),
    onMutate: async (id) => {
      const snapshot = await snapshotShopping(queryClient);
      updateShoppingCache(queryClient, (prev) => ({
        active: prev.active.filter((i) => i.id !== id),
        purchased: prev.purchased.filter((i) => i.id !== id),
      }));
      return { snapshot };
    },
    onError: (_err, _input, context) => {
      if (context) restoreShopping(queryClient, context.snapshot);
    },
    onSettled: (data) => {
      if (shouldRefetchShopping(data)) {
        queryClient.invalidateQueries({ queryKey: SHOPPING_KEY });
        queryClient.invalidateQueries({ queryKey: SUGGESTIONS_KEY });
      }
    },
  });
};

export type { CreateShoppingItemInput, ShoppingListResponse, ShoppingSuggestion };
