"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import type { ShoppingItem } from "@/db/schema/shopping-items";
import { useCreateEntry } from "@/hooks/use-entry-mutations";
import { AddItemInput } from "./_components/add-item-input";
import {
  type MoveToInventoryConfirm,
  MoveToInventoryDialog,
} from "./_components/move-to-inventory-dialog";
import { ShoppingListItem } from "./_components/shopping-list-item";
import { SuggestionsSection } from "./_components/suggestions-section";
import {
  useCreateShoppingItem,
  useDeleteShoppingItem,
  useShoppingList,
  useUpdateShoppingItem,
} from "./_hooks/use-shopping-list";

export default function ShoppingPage() {
  const { data, isLoading } = useShoppingList();
  const createItem = useCreateShoppingItem();
  const updateItem = useUpdateShoppingItem();
  const deleteItem = useDeleteShoppingItem();
  const createEntry = useCreateEntry();

  const [pendingPurchase, setPendingPurchase] = useState<ShoppingItem | null>(null);
  const [purchasedExpanded, setPurchasedExpanded] = useState(false);

  const handleTogglePurchased = (item: ShoppingItem, next: boolean) => {
    if (next && item.productId != null) {
      setPendingPurchase(item);
      return;
    }
    updateItem.mutate({ id: item.id, purchased: next });
  };

  const handleConfirmMove = async ({ compartment, expiryDate }: MoveToInventoryConfirm) => {
    if (!pendingPurchase || pendingPurchase.productId == null) return;
    const qty = pendingPurchase.quantity ?? 1;
    await createEntry.mutateAsync({
      productId: pendingPurchase.productId,
      quantity: qty,
      compartment,
      expiryDate,
    });
    await updateItem.mutateAsync({ id: pendingPurchase.id, purchased: true });
    setPendingPurchase(null);
  };

  const active = data?.active ?? [];
  const purchased = data?.purchased ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Shopping" description="Your household shopping list" />

      <div className="flex flex-col gap-4 px-4 pb-12">
        <AddItemInput
          onSubmit={async (input) => {
            await createItem.mutateAsync(input);
          }}
          disabled={createItem.isPending}
        />

        <SuggestionsSection />

        {isLoading ? (
          <p className="px-2 text-sm text-muted-foreground">Loading…</p>
        ) : active.length === 0 ? (
          <EmptyState title="Your list is empty" description="Add an item above to get started." />
        ) : (
          <ul className="flex flex-col gap-2">
            {active.map((item) => (
              <ShoppingListItem
                key={item.id}
                item={item}
                onTogglePurchased={handleTogglePurchased}
                onDelete={(id) => deleteItem.mutate(id)}
                disabled={updateItem.isPending}
              />
            ))}
          </ul>
        )}

        {purchased.length > 0 && (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit gap-1 px-2 text-xs text-muted-foreground"
              onClick={() => setPurchasedExpanded((v) => !v)}
              aria-expanded={purchasedExpanded}
            >
              {purchasedExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              Purchased ({purchased.length})
            </Button>
            {purchasedExpanded && (
              <ul className="flex flex-col gap-2">
                {purchased.map((item) => (
                  <ShoppingListItem
                    key={item.id}
                    item={item}
                    onTogglePurchased={handleTogglePurchased}
                    onDelete={(id) => deleteItem.mutate(id)}
                    disabled={updateItem.isPending}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {pendingPurchase && (
        <MoveToInventoryDialog
          open
          itemName={pendingPurchase.name}
          defaultQuantity={pendingPurchase.quantity ?? 1}
          onCancel={() => setPendingPurchase(null)}
          onConfirm={handleConfirmMove}
          isSubmitting={createEntry.isPending || updateItem.isPending}
        />
      )}
    </div>
  );
}
