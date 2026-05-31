"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {item?.product.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {item ? (
              <>
                This will remove {item.entries.length}{" "}
                {item.entries.length === 1 ? "entry" : "entries"} totalling {item.totalQuantity}{" "}
                {item.product.unit}.
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteAll.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={deleteAll.isPending}>
            {deleteAll.isPending ? "Deleting…" : "Delete all"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
