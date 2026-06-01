"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Product } from "@/db/schema/products";
import { useCreateEntry } from "@/hooks/use-entry-mutations";
import { mutateOrEnqueue } from "@/lib/offline/mutate-or-enqueue";
import type { MirrorRow } from "@/lib/offline/types";
import { EntryForm, type EntryFormData } from "./entry-form";
import { ProductAutocomplete, type ProductChoice } from "./product-autocomplete";

type AddEntryDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  initialProductChoice?: ProductChoice | null;
  initialCompartment?: "pantry" | "fridge" | "freezer";
};

export const AddEntryDialog = ({
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
  initialProductChoice = null,
  initialCompartment,
}: AddEntryDialogProps = {}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const [productChoice, setProductChoice] = useState<ProductChoice | null>(initialProductChoice);

  useEffect(() => {
    if (open) setProductChoice(initialProductChoice);
  }, [open, initialProductChoice]);
  const createEntry = useCreateEntry();
  const queryClient = useQueryClient();

  const handleReset = () => {
    setProductChoice(null);
  };

  const handleClose = () => {
    setOpen(false);
    setProductChoice(null);
  };

  const handleSubmit = async (data: EntryFormData) => {
    let productId: number;

    if (data.productChoice.type === "existing") {
      productId = data.productChoice.product.id;
    } else {
      // Create the product through mutateOrEnqueue so it works offline.
      // Offline path uses a negative temp id; the replay endpoint resolves
      // sibling references (the entries:create that runs next).
      const tempId = -Date.now();
      const productPayload = {
        name: data.productChoice.name,
        unit: data.unit,
        categoryId: data.categoryId,
        ...(data.barcode ? { barcode: data.barcode } : {}),
      };
      const synthetic: Product = {
        id: tempId,
        name: data.productChoice.name,
        unit: data.unit as Product["unit"],
        categoryId: data.categoryId ?? null,
        householdId: "offline",
        barcode: data.barcode ?? null,
        createdAt: new Date(),
      };
      // Optimistic products cache write so dropdowns/lookups see it.
      queryClient.setQueryData<Product[]>(["products", ""], (prev) =>
        prev ? [...prev, synthetic] : [synthetic]
      );

      const result = await mutateOrEnqueue<Product>({
        entity: "products",
        op: "create",
        payload: productPayload,
        tempId,
        mirrorRow: {
          ...synthetic,
          id: String(tempId),
          updatedAt: Date.now(),
        } as unknown as MirrorRow,
        online: async () => {
          const res = await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(productPayload),
          });
          if (!res.ok) {
            const body = (await res.json()) as { error?: string };
            throw new Error(body.error ?? "Failed to create product");
          }
          return res.json();
        },
      });

      if (result.kind === "applied") {
        productId = result.value.id;
        // Replace synthetic with real in cache.
        queryClient.setQueryData<Product[]>(["products", ""], (prev) =>
          prev ? prev.map((p) => (p.id === tempId ? result.value : p)) : prev
        );
        queryClient.invalidateQueries({ queryKey: ["products"] });
      } else {
        productId = tempId;
      }
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
  };

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
      <SheetContent side="bottom" className="h-[85vh] max-h-[85vh] overflow-y-auto rounded-t-xl">
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
              initialCompartment={initialCompartment}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
