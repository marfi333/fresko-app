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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const COMPARTMENTS = ["pantry", "fridge", "freezer"] as const;
type Compartment = (typeof COMPARTMENTS)[number];

export type MoveToInventoryConfirm = {
  compartment: Compartment;
  expiryDate?: string;
};

type MoveToInventoryDialogProps = {
  open: boolean;
  itemName: string;
  defaultQuantity: number;
  onCancel: () => void;
  onConfirm: (data: MoveToInventoryConfirm) => Promise<void> | void;
  isSubmitting?: boolean;
};

export const MoveToInventoryDialog = ({
  open,
  itemName,
  defaultQuantity,
  onCancel,
  onConfirm,
  isSubmitting,
}: MoveToInventoryDialogProps) => {
  const [compartment, setCompartment] = useState<Compartment>("pantry");
  const [expiryDate, setExpiryDate] = useState("");

  const handleConfirm = async () => {
    await onConfirm({
      compartment,
      expiryDate: expiryDate || undefined,
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onCancel()}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Move to inventory</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            Adding <strong className="text-foreground">{itemName}</strong>
            {defaultQuantity ? <> (qty {defaultQuantity})</> : null} to your inventory.
          </p>
          <div className="space-y-2">
            <Label htmlFor="move-compartment">Compartment</Label>
            <Select value={compartment} onValueChange={(v) => setCompartment(v as Compartment)}>
              <SelectTrigger id="move-compartment">
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
            <Label htmlFor="move-expiry">Expiry date (optional)</Label>
            <Input
              id="move-expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting ? "Moving…" : "Confirm"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
