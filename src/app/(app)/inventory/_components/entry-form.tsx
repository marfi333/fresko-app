"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/hooks/use-categories";
import type { ProductChoice } from "./product-autocomplete";

const UNITS = ["mL", "L", "g", "kg", "pieces", "packs"] as const;
const COMPARTMENTS = ["pantry", "fridge", "freezer"] as const;

export interface EntryFormData {
  productChoice: ProductChoice;
  quantity: number;
  compartment: "pantry" | "fridge" | "freezer";
  expiryDate?: string;
  unit?: string;
  categoryId?: number;
}

interface EntryFormProps {
  productChoice: ProductChoice;
  onSubmit: (data: EntryFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function EntryForm({
  productChoice,
  onSubmit,
  onCancel,
  isSubmitting,
}: EntryFormProps) {
  const { data: categories } = useCategories();

  const isExisting = productChoice.type === "existing";
  const existingProduct = isExisting ? productChoice.product : null;

  const [quantity, setQuantity] = useState("1");
  const [compartment, setCompartment] = useState<
    "pantry" | "fridge" | "freezer"
  >("pantry");
  const [expiryDate, setExpiryDate] = useState("");
  const [unit, setUnit] = useState(
    isExisting
      ? existingProduct!.unit
      : productChoice.suggestedUnit ?? "pieces"
  );
  const [categoryId, setCategoryId] = useState<number | undefined>(() => {
    if (isExisting) return existingProduct!.categoryId ?? undefined;
    if (productChoice.suggestedCategory && categories) {
      const match = categories.find(
        (c) =>
          c.name.toLowerCase() === productChoice.suggestedCategory!.toLowerCase()
      );
      return match?.id;
    }
    return undefined;
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    onSubmit({
      productChoice,
      quantity: qty,
      compartment,
      expiryDate: expiryDate || undefined,
      unit: isExisting ? undefined : unit,
      categoryId: isExisting ? undefined : categoryId,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="rounded-md bg-secondary/50 px-3 py-2">
        <span className="text-sm font-medium">
          {isExisting ? existingProduct!.name : productChoice.name}
        </span>
        {isExisting && (
          <span className="ml-2 text-xs text-muted-foreground">
            {existingProduct!.unit}
          </span>
        )}
      </div>

      {!isExisting && (
        <>
          <div className="space-y-2">
            <Label htmlFor="unit">Unit</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger id="unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={categoryId ? String(categoryId) : ""}
              onValueChange={(v) => setCategoryId(v ? parseInt(v, 10) : undefined)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="quantity">Quantity</Label>
        <Input
          id="quantity"
          type="number"
          min="0.01"
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="compartment">Compartment</Label>
        <Select
          value={compartment}
          onValueChange={(v) =>
            setCompartment(v as "pantry" | "fridge" | "freezer")
          }
        >
          <SelectTrigger id="compartment">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMPARTMENTS.map((c) => (
              <SelectItem key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiry-date">Expiry date (optional)</Label>
        <Input
          id="expiry-date"
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "Add entry"}
        </Button>
      </div>
    </form>
  );
}
