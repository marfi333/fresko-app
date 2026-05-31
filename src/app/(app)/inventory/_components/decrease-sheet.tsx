"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useDecreaseQuantity } from "@/hooks/use-entry-mutations";
import type { AggregatedProduct } from "./inventory-list";

type DecreaseSheetProps = {
  item: AggregatedProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const DecreaseSheet = ({ item, open, onOpenChange }: DecreaseSheetProps) => {
  const [amount, setAmount] = useState("1");
  const decrease = useDecreaseQuantity();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    const qty = parseFloat(amount);
    if (Number.isNaN(qty) || qty <= 0) return;

    decrease.mutate(
      { productId: item.product.id, amount: qty },
      {
        onSuccess: () => {
          onOpenChange(false);
          setAmount("1");
        },
      }
    );
  };

  if (!item) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Use {item.product.name}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Current stock: {item.totalQuantity} {item.product.unit}
          </p>
          <div className="space-y-2">
            <Label htmlFor="decrease-amount">Amount to use</Label>
            <Input
              id="decrease-amount"
              type="number"
              min="0.01"
              max={item.totalQuantity}
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={decrease.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={decrease.isPending}>
              {decrease.isPending ? "Removing..." : "Confirm"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
