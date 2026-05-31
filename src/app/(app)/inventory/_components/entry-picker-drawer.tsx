"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Entry } from "@/db/schema/entries";
import type { AggregatedProduct } from "./inventory-list";

const COMPARTMENT_LABELS: Record<Entry["compartment"], string> = {
  pantry: "Pantry",
  fridge: "Fridge",
  freezer: "Freezer",
};

type EntryPickerDrawerProps = {
  item: AggregatedProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPickEntry: (entry: Entry) => void;
};

export const EntryPickerDrawer = ({
  item,
  open,
  onOpenChange,
  onPickEntry,
}: EntryPickerDrawerProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle>{item ? `Edit ${item.product.name}` : "Edit"}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {item?.entries.map((entry) => {
            const expiry = entry.expiryDate
              ? new Date(entry.expiryDate).toLocaleDateString()
              : "No expiry";
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onPickEntry(entry)}
                className="flex w-full items-center justify-between rounded-md border px-4 py-3 text-left hover:bg-accent"
              >
                <div>
                  <p className="text-sm font-medium">{COMPARTMENT_LABELS[entry.compartment]}</p>
                  <p className="text-xs text-muted-foreground">{expiry}</p>
                </div>
                <p className="text-sm">
                  {entry.quantity} {item.product.unit}
                </p>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};
