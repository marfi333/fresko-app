"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type WasteCardProps = {
  data: { consumed: number; expired: number; discarded: number; wastePct: number };
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="flex flex-col items-center rounded-md bg-secondary/40 px-3 py-2">
    <span className="text-2xl font-semibold tabular-nums">{value}</span>
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

export const WasteCard = ({ data }: WasteCardProps) => {
  const total = data.consumed + data.expired + data.discarded;

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-baseline justify-between text-base">
          <span>Waste</span>
          <span className="text-2xl font-semibold tabular-nums">{data.wastePct}%</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {total === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No usage events in this range yet.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Consumed" value={data.consumed} />
            <Stat label="Expired" value={data.expired} />
            <Stat label="Discarded" value={data.discarded} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
