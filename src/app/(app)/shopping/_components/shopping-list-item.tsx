"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ShoppingItem } from "@/db/schema/shopping-items";

type ShoppingListItemProps = {
  item: ShoppingItem;
  onTogglePurchased: (item: ShoppingItem, next: boolean) => void;
  onDelete: (id: number) => void;
  disabled?: boolean;
};

export const ShoppingListItem = ({
  item,
  onTogglePurchased,
  onDelete,
  disabled,
}: ShoppingListItemProps) => {
  const qtyLabel =
    item.quantity != null ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""}` : null;

  return (
    <li className="flex items-center gap-3 rounded-md border bg-card px-3 py-2">
      <input
        type="checkbox"
        className="h-4 w-4 cursor-pointer accent-primary"
        checked={item.purchased}
        onChange={(e) => onTogglePurchased(item, e.target.checked)}
        disabled={disabled}
        aria-label={`Mark ${item.name} ${item.purchased ? "not purchased" : "purchased"}`}
      />
      <div className="flex flex-1 flex-col">
        <span
          className={
            item.purchased ? "text-sm text-muted-foreground line-through" : "text-sm font-medium"
          }
        >
          {item.name}
        </span>
        {qtyLabel && <span className="text-xs text-muted-foreground">{qtyLabel}</span>}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onDelete(item.id)}
        disabled={disabled}
        aria-label={`Remove ${item.name}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
};
