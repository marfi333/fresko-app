"use client";

import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { AggregatedProduct } from "./inventory-list";

type ProductRowProps = {
  item: AggregatedProduct;
  showCompartments: boolean;
  onDecrease?: (item: AggregatedProduct) => void;
  onAdd?: (item: AggregatedProduct) => void;
};

const COMPARTMENT_LABELS: Record<string, string> = {
  pantry: "P",
  fridge: "F",
  freezer: "Z",
};

export const ProductRow = ({ item, showCompartments, onDecrease, onAdd }: ProductRowProps) => {
  const { product, totalQuantity, compartments } = item;

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-6 py-3 hover:bg-accent/50 transition-colors">
      {onDecrease ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => onDecrease(item)}
          aria-label={`Decrease ${product.name}`}
        >
          <Minus className="h-4 w-4" />
        </Button>
      ) : (
        <span aria-hidden="true" className="h-7 w-7" />
      )}

      <div className="flex items-center gap-2 min-w-0">
        <Link href={`/inventory/${product.id}`} className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{product.name}</p>
          <p className="text-xs text-muted-foreground">
            {totalQuantity} {product.unit}
          </p>
        </Link>
        {onAdd && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => onAdd(item)}
            aria-label={`Add ${product.name}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showCompartments && compartments.size > 0 ? (
        <div className="flex gap-1 justify-self-end ml-3">
          {Array.from(compartments).map((c) => (
            <span
              key={c}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-medium text-secondary-foreground"
            >
              {COMPARTMENT_LABELS[c]}
            </span>
          ))}
        </div>
      ) : (
        <span aria-hidden="true" />
      )}
    </div>
  );
};
