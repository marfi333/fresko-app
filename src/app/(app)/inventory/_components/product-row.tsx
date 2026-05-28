"use client";

import Link from "next/link";
import type { AggregatedProduct } from "./inventory-list";

interface ProductRowProps {
  item: AggregatedProduct;
  showCompartments: boolean;
}

const COMPARTMENT_LABELS: Record<string, string> = {
  pantry: "P",
  fridge: "F",
  freezer: "Z",
};

export function ProductRow({ item, showCompartments }: ProductRowProps) {
  const { product, totalQuantity, nearestExpiry, compartments } = item;
  const isExpired = nearestExpiry && new Date(nearestExpiry) < new Date();

  return (
    <Link
      href={`/inventory/${product.id}`}
      className="flex items-center gap-3 px-6 py-3 hover:bg-accent/50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{product.name}</p>
        <p className="text-xs text-muted-foreground">
          {totalQuantity} {product.unit}
        </p>
      </div>

      {showCompartments && compartments.size > 0 && (
        <div className="flex gap-1">
          {Array.from(compartments).map((c) => (
            <span
              key={c}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-medium text-secondary-foreground"
            >
              {COMPARTMENT_LABELS[c]}
            </span>
          ))}
        </div>
      )}

      {isExpired && (
        <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
          Expired
        </span>
      )}

      {nearestExpiry && !isExpired && (
        <span className="text-xs text-muted-foreground">
          {new Date(nearestExpiry).toLocaleDateString()}
        </span>
      )}
    </Link>
  );
}
