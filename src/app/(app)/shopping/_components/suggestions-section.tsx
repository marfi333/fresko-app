"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateShoppingItem, useShoppingSuggestions } from "../_hooks/use-shopping-list";

export const SuggestionsSection = () => {
  const { data, isLoading } = useShoppingSuggestions();
  const createItem = useCreateShoppingItem();

  if (isLoading) return null;

  const suggestions = data?.suggestions ?? [];
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-secondary/40 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Suggestions
      </h3>
      <ul className="flex flex-col gap-1.5">
        {suggestions.map((s) => (
          <li
            key={s.productId}
            className="flex items-center justify-between rounded-md bg-card px-2 pl-3 py-1.5"
          >
            <span className="text-sm">{s.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={createItem.isPending}
              onClick={() =>
                createItem.mutate({
                  name: s.name,
                  productId: s.productId,
                  unit: s.unit,
                })
              }
              aria-label={`Add ${s.name} to shopping list`}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};
