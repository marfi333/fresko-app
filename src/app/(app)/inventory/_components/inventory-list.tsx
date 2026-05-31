"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton-list";
import type { Entry } from "@/db/schema/entries";
import type { Product } from "@/db/schema/products";
import { useEntries } from "@/hooks/use-entries";
import { useProducts } from "@/hooks/use-products";
import type { Compartment } from "./compartment-tabs";
import { DecreaseSheet } from "./decrease-sheet";
import { ProductRow } from "./product-row";

type InventoryListProps = {
  compartment: Compartment;
  categoryId?: number;
};

export type AggregatedProduct = {
  product: Product;
  totalQuantity: number;
  entries: Entry[];
  compartments: Set<Entry["compartment"]>;
  nearestExpiry: Date | null;
};

const aggregateByProduct = (products: Product[], entries: Entry[]): AggregatedProduct[] => {
  const productMap = new Map<number, Product>();
  for (const p of products) {
    productMap.set(p.id, p);
  }

  const grouped = new Map<number, Entry[]>();
  for (const entry of entries) {
    const existing = grouped.get(entry.productId) ?? [];
    existing.push(entry);
    grouped.set(entry.productId, existing);
  }

  const result: AggregatedProduct[] = [];
  for (const [productId, productEntries] of grouped) {
    const product = productMap.get(productId);
    if (!product) continue;

    const totalQuantity = productEntries.reduce((sum, e) => sum + e.quantity, 0);
    const compartments = new Set(productEntries.map((e) => e.compartment));

    let nearestExpiry: Date | null = null;
    for (const e of productEntries) {
      if (e.expiryDate) {
        const expiry = e.expiryDate instanceof Date ? e.expiryDate : new Date(e.expiryDate);
        if (!nearestExpiry || expiry < nearestExpiry) {
          nearestExpiry = expiry;
        }
      }
    }

    result.push({
      product,
      totalQuantity,
      entries: productEntries,
      compartments,
      nearestExpiry,
    });
  }

  return result.sort((a, b) => a.product.name.localeCompare(b.product.name));
};

export const InventoryList = ({ compartment, categoryId }: InventoryListProps) => {
  const [decreaseItem, setDecreaseItem] = useState<AggregatedProduct | null>(null);
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: entries, isLoading: entriesLoading } = useEntries(
    compartment === "all"
      ? categoryId
        ? { categoryId }
        : undefined
      : categoryId
        ? { compartment, categoryId }
        : { compartment }
  );

  const aggregated = useMemo(() => {
    if (!products || !entries) return [];
    return aggregateByProduct(products, entries);
  }, [products, entries]);

  if (productsLoading || entriesLoading) {
    return <SkeletonList count={5} />;
  }

  if (aggregated.length === 0) {
    return (
      <EmptyState
        title="No items yet"
        description="Add your first food item to start tracking your inventory."
      />
    );
  }

  return (
    <>
      <div className="divide-y divide-border">
        {aggregated.map((item) => (
          <ProductRow
            key={item.product.id}
            item={item}
            showCompartments={compartment === "all"}
            onDecrease={setDecreaseItem}
          />
        ))}
      </div>
      <DecreaseSheet
        item={decreaseItem}
        open={!!decreaseItem}
        onOpenChange={(open) => {
          if (!open) setDecreaseItem(null);
        }}
      />
    </>
  );
};
