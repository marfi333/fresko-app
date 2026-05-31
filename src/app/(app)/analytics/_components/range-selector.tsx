"use client";

import type { Range } from "@/lib/analytics/range";
import { cn } from "@/lib/utils";

const RANGES: readonly { value: Range; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "12mo", label: "12mo" },
] as const;

type RangeSelectorProps = {
  value: Range;
  onChange: (value: Range) => void;
};

export const RangeSelector = ({ value, onChange }: RangeSelectorProps) => {
  return (
    <div
      role="tablist"
      aria-label="Time range"
      className="inline-flex rounded-md border bg-card p-0.5"
    >
      {RANGES.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-sm px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
