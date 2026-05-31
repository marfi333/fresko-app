"use client";

import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/use-categories";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  value: number | undefined;
  onChange: (categoryId: number | undefined) => void;
}

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  const { data: categories } = useCategories();

  if (!categories || categories.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto px-6 pb-1 scrollbar-hide">
      <Button
        variant={value === undefined ? "default" : "outline"}
        size="sm"
        className={cn("h-7 shrink-0 text-xs")}
        onClick={() => onChange(undefined)}
      >
        All
      </Button>
      {categories.map((cat) => (
        <Button
          key={cat.id}
          variant={value === cat.id ? "default" : "outline"}
          size="sm"
          className={cn("h-7 shrink-0 text-xs")}
          onClick={() => onChange(cat.id)}
        >
          {cat.name}
        </Button>
      ))}
    </div>
  );
}
