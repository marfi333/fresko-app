"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Entry } from "@/db/schema/entries";
import { mirror } from "@/lib/offline/db";
import type { MirrorRow } from "@/lib/offline/types";

type UseEntriesOptions = {
  compartment?: "pantry" | "fridge" | "freezer";
  categoryId?: number;
  productId?: number;
};

const reviveEntry = (row: unknown): Entry => {
  const r = row as Record<string, unknown>;
  const out: Record<string, unknown> = {
    ...r,
    id: typeof r.id === "string" ? Number(r.id) : (r.id as number),
  };
  if (r.expiryDate !== undefined) {
    out.expiryDate = r.expiryDate ? new Date(r.expiryDate as string | number | Date) : null;
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
  return out as unknown as Entry;
};

const writeEntriesToMirror = (entries: Entry[]) => {
  // Fire-and-forget: don't block the UI if IDB is slow/unavailable.
  for (const e of entries) {
    const row: MirrorRow = {
      ...(e as unknown as Record<string, unknown>),
      id: String(e.id),
      updatedAt: e.updatedAt instanceof Date ? e.updatedAt.getTime() : Date.now(),
    } as MirrorRow;
    void mirror.put("entries", row);
  }
};

const readEntriesFromMirror = async (filter: UseEntriesOptions): Promise<Entry[]> => {
  const rows = await mirror.getAll("entries");
  return rows
    .map(reviveEntry)
    .filter((e) => (filter.productId ? e.productId === filter.productId : true))
    .filter((e) => (filter.compartment ? e.compartment === filter.compartment : true));
  // categoryId filter requires product join — skipped in offline fallback;
  // the mirror doesn't store the product->category mapping. The list will
  // reconcile on reconnect when the network query refetches.
};

export const useEntries = (options?: UseEntriesOptions) => {
  const filter = options ?? {};
  const { compartment, categoryId, productId } = filter;

  return useQuery<Entry[]>({
    queryKey: ["entries", compartment ?? "all", categoryId ?? null, productId ?? null],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (compartment) params.set("compartment", compartment);
      if (categoryId) params.set("categoryId", String(categoryId));
      if (productId) params.set("productId", String(productId));
      const url = `/api/entries${params.toString() ? `?${params}` : ""}`;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch entries");
        const data = (await res.json()) as Entry[];
        const revived = data.map(reviveEntry);
        writeEntriesToMirror(revived);
        return revived;
      } catch (err) {
        // Network down (or fetch threw): fall back to whatever the IDB mirror
        // has cached. categoryId filter won't be honored offline.
        if (err instanceof TypeError) return readEntriesFromMirror(filter);
        throw err;
      }
    },
    placeholderData: keepPreviousData,
  });
};
