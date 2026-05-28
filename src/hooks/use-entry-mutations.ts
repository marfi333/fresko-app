"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Entry } from "@/db/schema/entries";

interface CreateEntryInput {
  productId: number;
  quantity: number;
  compartment: "pantry" | "fridge" | "freezer";
  expiryDate?: string;
}

interface UpdateEntryInput {
  id: number;
  quantity?: number;
  compartment?: "pantry" | "fridge" | "freezer";
  expiryDate?: string | null;
}

interface DecreaseQuantityInput {
  productId: number;
  amount: number;
}

interface MarkAsWastedInput {
  id: number;
}

export function useCreateEntry() {
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
}

export function useUpdateEntry() {
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
}

export function useDeleteEntry() {
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
}

export function useDecreaseQuantity() {
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
}

export function useMarkAsWasted() {
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
}
