"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/hooks/use-categories";

const config = {
  total: {
    label: "Consumed",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

type TrendChartProps = {
  data: { bucket: string; total: number }[];
  categoryId: number | null;
  onCategoryChange: (id: number | null) => void;
};

export const TrendChart = ({ data, categoryId, onCategoryChange }: TrendChartProps) => {
  const { data: categories } = useCategories();
  const totalSum = data.reduce((sum, p) => sum + p.total, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Consumption</CardTitle>
        <Select
          value={categoryId ? String(categoryId) : "all"}
          onValueChange={(v) => onCategoryChange(v === "all" ? null : Number.parseInt(v, 10))}
        >
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {totalSum === 0 ? (
          <EmptyState
            title="No consumption data"
            description="Mark items as consumed to see trends."
          />
        ) : (
          <ChartContainer config={config} className="aspect-video w-full">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={32} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="total"
                fill="var(--color-total)"
                fillOpacity={0.2}
                stroke="var(--color-total)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};
