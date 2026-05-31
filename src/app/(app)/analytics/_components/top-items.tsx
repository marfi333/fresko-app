"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

type TopItemsProps = {
  data: { productId: number; name: string; total: number; unit: string | null }[];
};

const formatTotal = (total: number, unit: string | null) => {
  const rounded = Number.isInteger(total) ? total : Number(total.toFixed(2));
  return unit ? `${rounded} ${unit}` : String(rounded);
};

export const TopItems = ({ data }: TopItemsProps) => {
  const max = data.reduce((m, row) => Math.max(m, row.total), 0);

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base">Top consumed</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {data.length === 0 ? (
          <EmptyState title="No items yet" description="Consume something to populate this list." />
        ) : (
          <ul className="flex flex-col gap-2">
            {data.map((row) => {
              const pct = max > 0 ? Math.max((row.total / max) * 100, 4) : 0;
              return (
                <li key={row.productId} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{row.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatTotal(row.total, row.unit)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
