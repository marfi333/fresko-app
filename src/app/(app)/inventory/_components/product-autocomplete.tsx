"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import type { Product } from "@/db/schema/products";
import { useProductHints } from "@/hooks/use-product-hints";
import { useProducts } from "@/hooks/use-products";

export type ProductSelection = {
  type: "existing";
  product: Product;
};

export type NewProductSelection = {
  type: "new";
  name: string;
  suggestedUnit?: string;
  suggestedCategory?: string;
  barcode?: string;
};

export type ProductChoice = ProductSelection | NewProductSelection;

type ProductAutocompleteProps = {
  onSelect: (choice: ProductChoice) => void;
  disabled?: boolean;
};

export const ProductAutocomplete = ({ onSelect, disabled }: ProductAutocompleteProps) => {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: products } = useProducts(search.length >= 2 ? search : undefined);
  const { data: hints } = useProductHints(search);

  const filteredProducts = products ?? [];
  const hint = hints?.[0];

  const handleSelect = (product: Product) => {
    setSearch(product.name);
    setShowDropdown(false);
    onSelect({ type: "existing", product });
  };

  const handleCreateNew = () => {
    setShowDropdown(false);
    onSelect({
      type: "new",
      name: search,
      suggestedUnit: hint?.suggestedUnit ?? undefined,
      suggestedCategory: hint?.suggestedCategory ?? undefined,
    });
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        placeholder="Search or add a product..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setShowDropdown(e.target.value.length >= 2);
        }}
        onFocus={() => {
          if (search.length >= 2) setShowDropdown(true);
        }}
        disabled={disabled}
        aria-label="Product search"
      />
      {showDropdown && search.length >= 2 && (
        <div
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md"
          role="listbox"
        >
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              type="button"
              role="option"
              aria-selected={false}
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => handleSelect(product)}
            >
              <span className="flex-1 text-left">{product.name}</span>
              <span className="text-xs text-muted-foreground">{product.unit}</span>
            </button>
          ))}
          <button
            type="button"
            role="option"
            aria-selected={false}
            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm font-medium text-primary hover:bg-accent"
            onClick={handleCreateNew}
          >
            Create &ldquo;{search}&rdquo;
          </button>
        </div>
      )}
    </div>
  );
};
