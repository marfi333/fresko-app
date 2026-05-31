"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useDeleteAllProductEntries } from "@/hooks/use-entry-mutations";
import type { AggregatedProduct } from "./inventory-list";

type DeleteAllDialogProps = {
  item: AggregatedProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
};

export const DeleteAllDialog = ({ item, open, onOpenChange, onDeleted }: DeleteAllDialogProps) => {
  const deleteAll = useDeleteAllProductEntries();

  const handleConfirm = () => {
    if (!item) return;
    const ids = item.entries.map((e) => e.id);
    deleteAll.mutate(ids, {
      onSuccess: () => {
        onOpenChange(false);
        onDeleted?.();
      },
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Delete {item?.product.name}?</SheetTitle>
          <SheetDescription>
            {item ? (
              <>
                This will remove {item.entries.length}{" "}
                {item.entries.length === 1 ? "entry" : "entries"} totalling {item.totalQuantity}{" "}
                {item.product.unit}.
              </>
            ) : null}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteAll.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteAll.isPending}
          >
            {deleteAll.isPending ? "Deleting…" : "Delete all"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
