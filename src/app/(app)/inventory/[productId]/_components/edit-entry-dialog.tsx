"use client";

import { Pencil } from "lucide-react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Entry } from "@/db/schema/entries";
import { useUpdateEntry } from "@/hooks/use-entry-mutations";

const COMPARTMENTS = ["pantry", "fridge", "freezer"] as const;

type EditEntryDialogProps = {
  entry: Entry;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
};

export const EditEntryDialog = ({
  entry,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: EditEntryDialogProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const [quantity, setQuantity] = useState(String(entry.quantity));
  const [compartment, setCompartment] = useState(entry.compartment);
  const [expiryDate, setExpiryDate] = useState(() => {
    if (!entry.expiryDate) return "";
    const d = entry.expiryDate instanceof Date ? entry.expiryDate : new Date(entry.expiryDate);
    return d.toISOString().split("T")[0];
  });
  const updateEntry = useUpdateEntry();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (Number.isNaN(qty) || qty <= 0) return;

    updateEntry.mutate(
      {
        id: entry.id,
        quantity: qty,
        compartment,
        expiryDate: expiryDate || null,
      },
      { onSuccess: () => setOpen(false) }
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit entry">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </SheetTrigger>
      )}
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Edit entry</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-quantity">Quantity</Label>
            <Input
              id="edit-quantity"
              type="number"
              min="0.01"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-compartment">Compartment</Label>
            <Select
              value={compartment}
              onValueChange={(v) => setCompartment(v as "pantry" | "fridge" | "freezer")}
            >
              <SelectTrigger id="edit-compartment">
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
            <Label htmlFor="edit-expiry">Expiry date</Label>
            <Input
              id="edit-expiry"
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
              onClick={() => setOpen(false)}
              disabled={updateEntry.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={updateEntry.isPending}>
              {updateEntry.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
