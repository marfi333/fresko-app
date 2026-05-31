"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Range } from "@/lib/analytics/range";

export type AnalyticsResponse = {
  trend: { bucket: string; total: number }[];
  top: { productId: number; name: string; total: number; unit: string | null }[];
  waste: { consumed: number; expired: number; discarded: number; wastePct: number };
};

type UseAnalyticsOptions = {
  range: Range;
  categoryId?: number | null;
};

export const useAnalytics = ({ range, categoryId }: UseAnalyticsOptions) =>
  useQuery<AnalyticsResponse>({
    queryKey: ["analytics", range, categoryId ?? null],
    queryFn: async () => {
      const params = new URLSearchParams({ range });
      if (categoryId) params.set("categoryId", String(categoryId));
      const res = await fetch(`/api/analytics?${params}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    placeholderData: keepPreviousData,
  });
