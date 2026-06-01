"use client";

import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";

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

type EntriesSnapshot = ReadonlyArray<readonly [readonly unknown[], Entry[] | undefined]>;

const snapshotEntries = async (queryClient: QueryClient): Promise<EntriesSnapshot> => {
  await queryClient.cancelQueries({ queryKey: ["entries"] });
  return queryClient.getQueriesData<Entry[]>({ queryKey: ["entries"] }) as EntriesSnapshot;
};

const restoreSnapshot = (queryClient: QueryClient, snapshots: EntriesSnapshot) => {
  for (const [key, snapshot] of snapshots) {
    queryClient.setQueryData(key as readonly unknown[], snapshot);
  }
};

const updateEntriesCaches = (queryClient: QueryClient, updater: (list: Entry[]) => Entry[]) => {
  const matches = queryClient.getQueriesData<Entry[]>({ queryKey: ["entries"] });
  for (const [key, list] of matches) {
    if (!list) continue;
    queryClient.setQueryData(key, updater(list));
  }
};

const sortByExpiryAsc = (a: Entry, b: Entry): number => {
  if (a.expiryDate && b.expiryDate) return a.expiryDate.getTime() - b.expiryDate.getTime();
  if (a.expiryDate) return -1;
  if (b.expiryDate) return 1;
  return 0;
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

// Common context shape returned by onMutate, consumed by onError for rollback.
type EntriesMutationContext = { snapshots: EntriesSnapshot };

const invalidateEntriesAndProducts = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ["entries"] });
  queryClient.invalidateQueries({ queryKey: ["products"] });
};

// When data?.kind === 'enqueued' we deliberately skip the post-mutation
// refetch — the optimistic cache is the truth until reconnect, and the
// query-bridge's online/focus listener will trigger drainAndInvalidate.
const shouldRefetch = <T>(
  data: { kind: "applied"; value: T } | { kind: "enqueued"; clientTs: number } | undefined
) => data?.kind === "applied";

export const useCreateEntry = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { kind: "applied"; value: Entry } | { kind: "enqueued"; clientTs: number },
    Error,
    CreateEntryInput,
    EntriesMutationContext
  >({
    mutationFn: (input) => {
      const synthetic = syntheticEntry(input);
      return mutateOrEnqueue<Entry>({
        entity: "entries",
        op: "create",
        payload: { ...input },
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
    },
    onMutate: async (input) => {
      const snapshots = await snapshotEntries(queryClient);
      const synthetic = syntheticEntry(input);
      updateEntriesCaches(queryClient, (list) => [...list, synthetic]);
      return { snapshots };
    },
    onError: (_err, _input, context) => {
      if (context) restoreSnapshot(queryClient, context.snapshots);
    },
    onSuccess: (data) => {
      if (data.kind !== "applied") return;
      // Replace the synthetic row (negative id) with the real one returned by the server.
      const real = data.value;
      updateEntriesCaches(queryClient, (list) =>
        list.map((e) => (e.id < 0 && e.productId === real.productId ? real : e))
      );
    },
    onSettled: (data) => {
      if (shouldRefetch(data)) invalidateEntriesAndProducts(queryClient);
    },
  });
};

export const useUpdateEntry = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { kind: "applied"; value: Entry } | { kind: "enqueued"; clientTs: number },
    Error,
    UpdateEntryInput,
    EntriesMutationContext
  >({
    mutationFn: async ({ id, ...updates }) => {
      const mirrorId = String(id);
      const existing = await mirror.get("entries", mirrorId);
      const optimistic = existing
        ? ({ ...existing, ...updates, updatedAt: Date.now() } as MirrorRow)
        : undefined;

      return mutateOrEnqueue<Entry>({
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
    },
    onMutate: async ({ id, ...updates }) => {
      const snapshots = await snapshotEntries(queryClient);
      updateEntriesCaches(queryClient, (list) =>
        list.map((e) =>
          e.id === id
            ? ({
                ...e,
                ...updates,
                expiryDate:
                  updates.expiryDate === undefined
                    ? e.expiryDate
                    : updates.expiryDate
                      ? new Date(updates.expiryDate)
                      : null,
                updatedAt: new Date(),
              } as Entry)
            : e
        )
      );
      return { snapshots };
    },
    onError: (_err, _input, context) => {
      if (context) restoreSnapshot(queryClient, context.snapshots);
    },
    onSettled: (data) => {
      if (shouldRefetch(data)) invalidateEntriesAndProducts(queryClient);
    },
  });
};

export const useDeleteEntry = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { kind: "applied"; value: { success: boolean } } | { kind: "enqueued"; clientTs: number },
    Error,
    number,
    EntriesMutationContext
  >({
    mutationFn: (id) =>
      mutateOrEnqueue<{ success: boolean }>({
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
      }),
    onMutate: async (id) => {
      const snapshots = await snapshotEntries(queryClient);
      updateEntriesCaches(queryClient, (list) => list.filter((e) => e.id !== id));
      return { snapshots };
    },
    onError: (_err, _input, context) => {
      if (context) restoreSnapshot(queryClient, context.snapshots);
    },
    onSettled: (data) => {
      if (shouldRefetch(data)) invalidateEntriesAndProducts(queryClient);
    },
  });
};

export const useDecreaseQuantity = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { kind: "applied"; value: { decreasedTotal: number } } | { kind: "enqueued"; clientTs: number },
    Error,
    DecreaseQuantityInput,
    EntriesMutationContext
  >({
    mutationFn: async (input) => {
      // Compute mirror-side FIFO ops from the IDB mirror so durable state
      // stays consistent with the optimistic cache update we did in onMutate.
      const productEntries = (await mirror.getAll("entries")).filter(
        (row) => (row as unknown as Entry).productId === input.productId
      );
      productEntries.sort((a, b) => sortByExpiryAsc(a as unknown as Entry, b as unknown as Entry));

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

      return mutateOrEnqueue<{ decreasedTotal: number }>({
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
    },
    onMutate: async (input) => {
      const snapshots = await snapshotEntries(queryClient);
      updateEntriesCaches(queryClient, (list) => {
        const productEntries = list.filter((e) => e.productId === input.productId);
        if (productEntries.length === 0) return list;
        productEntries.sort(sortByExpiryAsc);

        const updates = new Map<number, Entry | null>();
        let remaining = input.amount;
        for (const entry of productEntries) {
          if (remaining <= 0) break;
          const deduction = Math.min(remaining, entry.quantity);
          remaining -= deduction;
          if (deduction >= entry.quantity) {
            updates.set(entry.id, null);
          } else {
            updates.set(entry.id, {
              ...entry,
              quantity: entry.quantity - deduction,
              updatedAt: new Date(),
            });
          }
        }

        const result: Entry[] = [];
        for (const e of list) {
          if (!updates.has(e.id)) {
            result.push(e);
            continue;
          }
          const next = updates.get(e.id);
          if (next) result.push(next);
        }
        return result;
      });
      return { snapshots };
    },
    onError: (_err, _input, context) => {
      if (context) restoreSnapshot(queryClient, context.snapshots);
    },
    onSettled: (data) => {
      if (shouldRefetch(data)) invalidateEntriesAndProducts(queryClient);
    },
  });
};

export const useDeleteAllProductEntries = () => {
  const queryClient = useQueryClient();

  return useMutation<{ success: true }, Error, number[], EntriesMutationContext>({
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
    onMutate: async (ids) => {
      const snapshots = await snapshotEntries(queryClient);
      const idSet = new Set(ids);
      updateEntriesCaches(queryClient, (list) => list.filter((e) => !idSet.has(e.id)));
      return { snapshots };
    },
    onError: (_err, _input, context) => {
      if (context) restoreSnapshot(queryClient, context.snapshots);
    },
    onSettled: () => {
      // Always refetch — at least one of the deletes resolved synchronously.
      invalidateEntriesAndProducts(queryClient);
    },
  });
};

export const useMarkAsWasted = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { kind: "applied"; value: { success: boolean } } | { kind: "enqueued"; clientTs: number },
    Error,
    MarkAsWastedInput,
    EntriesMutationContext
  >({
    mutationFn: ({ id }) =>
      mutateOrEnqueue<{ success: boolean }>({
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
      }),
    onMutate: async ({ id }) => {
      const snapshots = await snapshotEntries(queryClient);
      updateEntriesCaches(queryClient, (list) => list.filter((e) => e.id !== id));
      return { snapshots };
    },
    onError: (_err, _input, context) => {
      if (context) restoreSnapshot(queryClient, context.snapshots);
    },
    onSettled: (data) => {
      if (shouldRefetch(data)) invalidateEntriesAndProducts(queryClient);
    },
  });
};
