"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Entry } from "@/db/schema/entries";
import { mirror } from "@/lib/offline/db";
import { mutateOrEnqueue } from "@/lib/offline/mutate-or-enqueue";
import type { MirrorOp } from "@/lib/offline/outbox";
import type { MirrorRow } from "@/lib/offline/types";

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

// Synthetic Entry returned when a create is enqueued offline. The id is a
// negative `Date.now()` so it sorts last and is recognizable as offline-only.
// The replay+refetch cycle replaces it with the real row.
const syntheticEntry = (input: CreateEntryInput): Entry => {
  const now = Date.now();
  return {
    id: -now,
    productId: input.productId,
    quantity: input.quantity,
    compartment: input.compartment,
    expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
    createdBy: "offline",
    householdId: "offline",
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
};

export const useCreateEntry = () => {
  const queryClient = useQueryClient();

  return useMutation<Entry, Error, CreateEntryInput>({
    mutationFn: async (input) => {
      const synthetic = syntheticEntry(input);
      const result = await mutateOrEnqueue<Entry>({
        entity: "entries",
        op: "create",
        payload: { ...input },
        // For offline creates, write a placeholder row keyed by the negative
        // id so views that read the mirror see the new item immediately.
        mirrorRow: { ...synthetic, id: String(synthetic.id) } as unknown as MirrorRow,
        online: async () => {
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
      });
      return result.kind === "applied" ? result.value : synthetic;
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
      const mirrorId = String(id);
      const existing = await mirror.get("entries", mirrorId);
      const optimistic = existing
        ? ({ ...existing, ...updates, updatedAt: Date.now() } as MirrorRow)
        : undefined;

      const result = await mutateOrEnqueue<Entry>({
        entity: "entries",
        op: "update",
        serverId: id,
        payload: updates,
        mirrorRow: optimistic,
        online: async () => {
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
      });
      return result.kind === "applied" ? result.value : (optimistic as unknown as Entry);
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
      const result = await mutateOrEnqueue<{ success: boolean }>({
        entity: "entries",
        op: "delete",
        serverId: id,
        mirrorId: String(id),
        payload: {},
        online: async () => {
          const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
          if (!res.ok) {
            const body = (await res.json()) as { error?: string };
            throw new Error(body.error ?? "Failed to delete entry");
          }
          return res.json();
        },
      });
      return result.kind === "applied" ? result.value : { success: true };
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
      // Optimistic decrease across the mirror (FIFO by expiry, mirroring the
      // server's logic). For each affected entry, either decrement quantity
      // or delete the row if it goes to zero.
      const productEntries = (await mirror.getAll("entries")).filter(
        (row) => (row as unknown as Entry).productId === input.productId
      );
      productEntries.sort((a, b) => {
        const ae = (a as unknown as Entry).expiryDate;
        const be = (b as unknown as Entry).expiryDate;
        if (ae && be) return ae.getTime() - be.getTime();
        if (ae) return -1;
        if (be) return 1;
        return 0;
      });

      const extraMirrorOps: MirrorOp[] = [];
      let remaining = input.amount;
      for (const row of productEntries) {
        if (remaining <= 0) break;
        const entry = row as unknown as Entry;
        const deduction = Math.min(remaining, entry.quantity);
        remaining -= deduction;
        if (deduction >= entry.quantity) {
          extraMirrorOps.push({ kind: "del", id: String(entry.id) });
        } else {
          extraMirrorOps.push({
            kind: "put",
            row: {
              ...(row as unknown as Record<string, unknown>),
              quantity: entry.quantity - deduction,
              updatedAt: Date.now(),
            } as unknown as MirrorRow,
          });
        }
      }

      const result = await mutateOrEnqueue<{ decreasedTotal: number }>({
        entity: "entries",
        op: "decrease",
        payload: input,
        extraMirrorOps,
        online: async () => {
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
      });
      return result.kind === "applied" ? result.value : { decreasedTotal: input.amount };
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
      for (const id of ids) {
        await mutateOrEnqueue<{ success: boolean }>({
          entity: "entries",
          op: "delete",
          serverId: id,
          mirrorId: String(id),
          payload: {},
          online: async () => {
            const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
            if (!res.ok) {
              const body = (await res.json()) as { error?: string };
              throw new Error(body.error ?? `Failed to delete entry ${id}`);
            }
            return res.json();
          },
        });
      }
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
      const result = await mutateOrEnqueue<{ success: boolean }>({
        entity: "entries",
        op: "delete",
        serverId: id,
        mirrorId: String(id),
        payload: {},
        online: async () => {
          const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
          if (!res.ok) {
            const body = (await res.json()) as { error?: string };
            throw new Error(body.error ?? "Failed to mark as wasted");
          }
          return res.json();
        },
      });
      return result.kind === "applied" ? result.value : { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};
