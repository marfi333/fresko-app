"use client";

import { Plus } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product } from "@/db/schema/products";
import { useProducts } from "@/hooks/use-products";
import type { CreateShoppingItemInput } from "../_hooks/use-shopping-list";

const UNITS = ["", "mL", "L", "g", "kg", "pieces", "packs"] as const;

type AddItemInputProps = {
  onSubmit: (input: CreateShoppingItemInput) => Promise<void> | void;
  disabled?: boolean;
};

export const AddItemInput = ({ onSubmit, disabled }: AddItemInputProps) => {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<string>("");
  const [productId, setProductId] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: products } = useProducts(name.length >= 2 ? name : undefined);
  const visibleProducts = (products ?? []).slice(0, 6);

  const handleSelectProduct = (product: Product) => {
    setName(product.name);
    setProductId(product.id);
    setUnit(product.unit);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const qty = quantity.trim() ? Number.parseFloat(quantity) : null;
    await onSubmit({
      name: trimmed,
      productId,
      quantity: qty != null && !Number.isNaN(qty) ? qty : null,
      unit: unit || null,
    });
    setName("");
    setQuantity("");
    setUnit("");
    setProductId(null);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-md border bg-card p-3">
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder="Add item…"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setProductId(null);
            setShowDropdown(e.target.value.length >= 2);
          }}
          onFocus={() => {
            if (name.length >= 2) setShowDropdown(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setShowDropdown(false), 150);
          }}
          disabled={disabled}
          aria-label="Item name"
        />
        {showDropdown && visibleProducts.length > 0 && (
          <div
            className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md"
            role="listbox"
          >
            {visibleProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                role="option"
                aria-selected={productId === product.id}
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                onClick={() => handleSelectProduct(product)}
              >
                <span className="flex-1 text-left">{product.name}</span>
                <span className="text-xs text-muted-foreground">{product.unit}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          placeholder="Qty"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          disabled={disabled}
          aria-label="Quantity (optional)"
          className="w-24"
        />
        <Select value={unit} onValueChange={setUnit} disabled={disabled}>
          <SelectTrigger className="w-28" aria-label="Unit (optional)">
            <SelectValue placeholder="Unit" />
          </SelectTrigger>
          <SelectContent>
            {UNITS.filter((u) => u !== "").map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" className="flex-1" disabled={disabled || !name.trim()}>
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </div>
    </form>
  );
};
