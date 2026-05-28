"use client";

import { useMemo } from "react";
import { useProducts } from "@/hooks/use-products";
import { useEntries } from "@/hooks/use-entries";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { ProductRow } from "./product-row";
import type { Compartment } from "./compartment-tabs";
import type { Product } from "@/db/schema/products";
import type { Entry } from "@/db/schema/entries";

interface InventoryListProps {
  compartment: Compartment;
  categoryId?: number;
}

export interface AggregatedProduct {
  product: Product;
  totalQuantity: number;
  entries: Entry[];
  compartments: Set<Entry["compartment"]>;
  nearestExpiry: Date | null;
}

function aggregateByProduct(
  products: Product[],
  entries: Entry[]
): AggregatedProduct[] {
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
}

export function InventoryList({ compartment, categoryId }: InventoryListProps) {
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
    <div className="divide-y divide-border">
      {aggregated.map((item) => (
        <ProductRow
          key={item.product.id}
          item={item}
          showCompartments={compartment === "all"}
        />
      ))}
    </div>
  );
}
