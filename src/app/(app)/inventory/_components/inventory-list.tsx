"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { EditEntryDialog } from "@/app/(app)/inventory/[productId]/_components/edit-entry-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton-list";
import type { Entry } from "@/db/schema/entries";
import type { Product } from "@/db/schema/products";
import { useEntries } from "@/hooks/use-entries";
import { useProducts } from "@/hooks/use-products";
import { AddEntryDialog } from "./add-entry-dialog";
import type { Compartment } from "./compartment-tabs";
import { DecreaseSheet } from "./decrease-sheet";
import { DeleteAllDialog } from "./delete-all-dialog";
import { EntryPickerDrawer } from "./entry-picker-drawer";
import type { ProductChoice } from "./product-autocomplete";
import { ProductRow } from "./product-row";
import { SwipeRow, SwipeRowProvider } from "./swipe-row";

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
  const [addChoice, setAddChoice] = useState<ProductChoice | null>(null);
  const [addCompartment, setAddCompartment] = useState<"pantry" | "fridge" | "freezer" | undefined>(
    undefined
  );
  const [editItem, setEditItem] = useState<AggregatedProduct | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [deleteItem, setDeleteItem] = useState<AggregatedProduct | null>(null);
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
    <SwipeRowProvider>
      <div className="divide-y divide-border">
        {aggregated.map((item) => (
          <SwipeRow
            key={item.product.id}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => setEditItem(item)}
                  className="flex flex-1 flex-col items-center justify-center gap-1 bg-secondary text-secondary-foreground"
                  aria-label={`Edit ${item.product.name}`}
                >
                  <Pencil className="h-5 w-5" />
                  <span className="text-xs">Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteItem(item)}
                  className="flex flex-1 flex-col items-center justify-center gap-1 bg-destructive text-destructive-foreground"
                  aria-label={`Delete ${item.product.name}`}
                >
                  <Trash2 className="h-5 w-5" />
                  <span className="text-xs">Delete</span>
                </button>
              </>
            }
          >
            <ProductRow
              item={item}
              showCompartments={compartment === "all"}
              onDecrease={setDecreaseItem}
              onAdd={(target) => {
                setAddChoice({ type: "existing", product: target.product });
                setAddCompartment(
                  compartment === "all" ? Array.from(target.compartments)[0] : compartment
                );
              }}
            />
          </SwipeRow>
        ))}
      </div>
      <DecreaseSheet
        item={decreaseItem}
        open={!!decreaseItem}
        onOpenChange={(open) => {
          if (!open) setDecreaseItem(null);
        }}
      />
      <AddEntryDialog
        open={!!addChoice}
        onOpenChange={(open) => {
          if (!open) {
            setAddChoice(null);
            setAddCompartment(undefined);
          }
        }}
        showTrigger={false}
        initialProductChoice={addChoice}
        initialCompartment={addCompartment}
      />
      <EntryPickerDrawer
        item={editItem}
        open={!!editItem}
        onOpenChange={(open) => {
          if (!open) setEditItem(null);
        }}
        onPickEntry={(entry) => {
          setEditItem(null);
          setEditingEntry(entry);
        }}
      />
      {editingEntry && (
        <EditEntryDialog
          entry={editingEntry}
          open={!!editingEntry}
          onOpenChange={(open) => {
            if (!open) setEditingEntry(null);
          }}
          showTrigger={false}
        />
      )}
      <DeleteAllDialog
        item={deleteItem}
        open={!!deleteItem}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
      />
    </SwipeRowProvider>
  );
};
