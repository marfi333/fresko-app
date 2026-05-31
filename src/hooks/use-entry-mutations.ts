"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Entry } from "@/db/schema/entries";

type CreateEntryInput = {
  productId: number;
  quantity: number;
  compartment: "pantry" | "fridge" | "freezer";
  expiryDate?: string;
};

type UpdateEntryInput = {
  id: number;
  quantity?: number;
  compartment?: "pantry" | "fridge" | "freezer";
  expiryDate?: string | null;
};

type DecreaseQuantityInput = {
  productId: number;
  amount: number;
};

type MarkAsWastedInput = {
  id: number;
};

export const useCreateEntry = () => {
  const queryClient = useQueryClient();

  return useMutation<Entry, Error, CreateEntryInput>({
    mutationFn: async (input) => {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to create entry");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useUpdateEntry = () => {
  const queryClient = useQueryClient();

  return useMutation<Entry, Error, UpdateEntryInput>({
    mutationFn: async ({ id, ...updates }) => {
      const res = await fetch(`/api/entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to update entry");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });
};

export const useDeleteEntry = () => {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/entries/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to delete entry");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useDecreaseQuantity = () => {
  const queryClient = useQueryClient();

  return useMutation<{ decreasedTotal: number }, Error, DecreaseQuantityInput>({
    mutationFn: async (input) => {
      const res = await fetch("/api/entries/decrease", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to decrease quantity");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useDeleteAllProductEntries = () => {
  const queryClient = useQueryClient();

  return useMutation<{ success: true }, Error, number[]>({
    mutationFn: async (ids) => {
      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
          if (!res.ok) {
            const body = (await res.json()) as { error?: string };
            throw new Error(body.error ?? `Failed to delete entry ${id}`);
          }
          return res.json();
        })
      );
      void results;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useMarkAsWasted = () => {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, MarkAsWastedInput>({
    mutationFn: async ({ id }) => {
      const res = await fetch(`/api/entries/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to mark as wasted");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};
