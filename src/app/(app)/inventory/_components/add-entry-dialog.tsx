"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCreateEntry } from "@/hooks/use-entry-mutations";
import { useQueryClient } from "@tanstack/react-query";
import {
  ProductAutocomplete,
  type ProductChoice,
} from "./product-autocomplete";
import { EntryForm, type EntryFormData } from "./entry-form";

interface AddEntryDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export function AddEntryDialog({
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: AddEntryDialogProps = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const [productChoice, setProductChoice] = useState<ProductChoice | null>(
    null
  );
  const createEntry = useCreateEntry();
  const queryClient = useQueryClient();

  function handleReset() {
    setProductChoice(null);
  }

  function handleClose() {
    setOpen(false);
    setProductChoice(null);
  }

  async function handleSubmit(data: EntryFormData) {
    let productId: number;

    if (data.productChoice.type === "existing") {
      productId = data.productChoice.product.id;
    } else {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.productChoice.name,
          unit: data.unit,
          categoryId: data.categoryId,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to create product");
      }
      const product = (await res.json()) as { id: number };
      productId = product.id;
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }

    createEntry.mutate(
      {
        productId,
        quantity: data.quantity,
        compartment: data.compartment,
        expiryDate: data.expiryDate,
      },
      {
        onSuccess: () => handleClose(),
      }
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <SheetTrigger asChild>
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </SheetTrigger>
      )}
      <SheetContent
        side="bottom"
        className="h-[85vh] max-h-[85vh] overflow-y-auto rounded-t-xl"
      >
        <SheetHeader>
          <SheetTitle>Add inventory entry</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {!productChoice ? (
            <ProductAutocomplete onSelect={setProductChoice} />
          ) : (
            <EntryForm
              productChoice={productChoice}
              onSubmit={handleSubmit}
              onCancel={handleReset}
              isSubmitting={createEntry.isPending}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
