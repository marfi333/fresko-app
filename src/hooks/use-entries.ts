"use client";

import { useQuery } from "@tanstack/react-query";
import type { Entry } from "@/db/schema/entries";

interface UseEntriesOptions {
  compartment?: "pantry" | "fridge" | "freezer";
  categoryId?: number;
}

export function useEntries(options?: UseEntriesOptions) {
  const { compartment, categoryId } = options ?? {};

  return useQuery<Entry[]>({
    queryKey: ["entries", compartment ?? "all", categoryId ?? null],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (compartment) params.set("compartment", compartment);
      if (categoryId) params.set("categoryId", String(categoryId));
      const url = `/api/entries${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch entries");
      return res.json();
    },
  });
}
