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
      className="flex w-full rounded-md border bg-card p-0.5 sm:inline-flex sm:w-auto"
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
              "flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none sm:py-1 sm:text-xs",
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
