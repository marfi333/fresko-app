import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Entry } from "@/db/schema/entries";
import type { Product } from "@/db/schema/products";
import { EntryPickerDrawer } from "../entry-picker-drawer";
import type { AggregatedProduct } from "../inventory-list";

const product: Product = {
  id: 1,
  name: "Whole Milk",
  unit: "L",
  categoryId: null,
  householdId: "hh-1",
  barcode: null,
  createdAt: new Date(),
};

const makeEntry = (id: number, overrides: Partial<Entry> = {}): Entry => ({
  id,
  productId: 1,
  quantity: 1,
  compartment: "fridge",
  expiryDate: null,
  createdBy: "user-1",
  householdId: "hh-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeItem = (entries: Entry[]): AggregatedProduct => ({
  product,
  totalQuantity: entries.reduce((s, e) => s + e.quantity, 0),
  entries,
  compartments: new Set(entries.map((e) => e.compartment)),
  nearestExpiry: null,
});

describe("EntryPickerDrawer", () => {
  it("lists every entry of the aggregated product", () => {
    const item = makeItem([
      makeEntry(1, { compartment: "fridge", quantity: 2 }),
      makeEntry(2, { compartment: "freezer", quantity: 5 }),
    ]);
    render(<EntryPickerDrawer item={item} open onOpenChange={vi.fn()} onPickEntry={vi.fn()} />);
    expect(screen.getByText("Fridge")).toBeInTheDocument();
    expect(screen.getByText("Freezer")).toBeInTheDocument();
    expect(screen.getByText("2 L")).toBeInTheDocument();
    expect(screen.getByText("5 L")).toBeInTheDocument();
  });

  it("invokes onPickEntry with the picked entry", async () => {
    const onPickEntry = vi.fn();
    const fridgeEntry = makeEntry(7, { compartment: "fridge", quantity: 3 });
    const item = makeItem([fridgeEntry]);
    render(<EntryPickerDrawer item={item} open onOpenChange={vi.fn()} onPickEntry={onPickEntry} />);
    await userEvent.click(screen.getByText("Fridge"));
    expect(onPickEntry).toHaveBeenCalledWith(fridgeEntry);
  });

  it("renders nothing when closed", () => {
    const item = makeItem([makeEntry(1)]);
    render(
      <EntryPickerDrawer item={item} open={false} onOpenChange={vi.fn()} onPickEntry={vi.fn()} />
    );
    expect(screen.queryByText("Fridge")).not.toBeInTheDocument();
  });
});
