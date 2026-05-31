"use client";

import { parseAsInteger, parseAsStringEnum, useQueryState } from "nuqs";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { DEFAULT_RANGE, type Range, VALID_RANGES } from "@/lib/analytics/range";
import { RangeSelector } from "./_components/range-selector";
import { TopItems } from "./_components/top-items";
import { TrendChart } from "./_components/trend-chart";
import { WasteCard } from "./_components/waste-card";
import { useAnalytics } from "./_hooks/use-analytics";

const rangeParser = parseAsStringEnum<Range>([...VALID_RANGES]).withDefault(DEFAULT_RANGE);

const AnalyticsPageInner = () => {
  const [range, setRange] = useQueryState("range", rangeParser);
  const [categoryId, setCategoryId] = useQueryState("categoryId", parseAsInteger);

  const { data, isLoading } = useAnalytics({ range, categoryId });

  const trend = data?.trend ?? [];
  const top = data?.top ?? [];
  const waste = data?.waste ?? { consumed: 0, expired: 0, discarded: 0, wastePct: 0 };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Analytics" description="Consumption insights for your household" />

      <div className="flex flex-col gap-4 px-4 pb-12">
        <RangeSelector value={range} onChange={setRange} />

        {isLoading && !data ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <TrendChart data={trend} categoryId={categoryId} onCategoryChange={setCategoryId} />
            <WasteCard data={waste} />
            <TopItems data={top} />
          </>
        )}
      </div>
    </div>
  );
};

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <PageHeader title="Analytics" description="Consumption insights for your household" />
        </div>
      }
    >
      <AnalyticsPageInner />
    </Suspense>
  );
}
