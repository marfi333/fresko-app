import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Entry } from "@/db/schema/entries";
import type { Product } from "@/db/schema/products";
import { createQueryWrapper } from "@/test/query-wrapper";
import { DeleteAllDialog } from "../delete-all-dialog";
import type { AggregatedProduct } from "../inventory-list";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const product: Product = {
  id: 1,
  name: "Whole Milk",
  unit: "L",
  categoryId: null,
  householdId: "hh-1",
  barcode: null,
  createdAt: new Date(),
};

const makeEntry = (id: number, quantity: number): Entry => ({
  id,
  productId: 1,
  quantity,
  compartment: "fridge",
  expiryDate: null,
  createdBy: "user-1",
  householdId: "hh-1",
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeItem = (entries: Entry[]): AggregatedProduct => ({
  product,
  totalQuantity: entries.reduce((s, e) => s + e.quantity, 0),
  entries,
  compartments: new Set(entries.map((e) => e.compartment)),
  nearestExpiry: null,
});

describe("DeleteAllDialog", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("renders the entry count and total quantity", () => {
    const { wrapper } = createQueryWrapper();
    const item = makeItem([makeEntry(1, 2), makeEntry(2, 3)]);
    render(<DeleteAllDialog item={item} open onOpenChange={vi.fn()} onDeleted={vi.fn()} />, {
      wrapper,
    });
    expect(screen.getByText(/Delete Whole Milk\?/i)).toBeInTheDocument();
    expect(screen.getByText(/2 entries/i)).toBeInTheDocument();
    expect(screen.getByText(/totalling 5 L/i)).toBeInTheDocument();
  });

  it("uses singular wording for a single entry", () => {
    const { wrapper } = createQueryWrapper();
    const item = makeItem([makeEntry(1, 4)]);
    render(<DeleteAllDialog item={item} open onOpenChange={vi.fn()} />, { wrapper });
    expect(screen.getByText(/1 entry/i)).toBeInTheDocument();
  });

  it("calls DELETE on each entry id when confirmed and notifies onDeleted", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    const onOpenChange = vi.fn();
    const onDeleted = vi.fn();
    const { wrapper } = createQueryWrapper();
    const item = makeItem([makeEntry(10, 1), makeEntry(11, 1), makeEntry(12, 1)]);
    render(<DeleteAllDialog item={item} open onOpenChange={onOpenChange} onDeleted={onDeleted} />, {
      wrapper,
    });

    await userEvent.click(screen.getByRole("button", { name: /delete all/i }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenCalledWith("/api/entries/10", { method: "DELETE" });
    expect(mockFetch).toHaveBeenCalledWith("/api/entries/11", { method: "DELETE" });
    expect(mockFetch).toHaveBeenCalledWith("/api/entries/12", { method: "DELETE" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes dialog on cancel without deleting", async () => {
    const onOpenChange = vi.fn();
    const { wrapper } = createQueryWrapper();
    const item = makeItem([makeEntry(1, 1)]);
    render(<DeleteAllDialog item={item} open onOpenChange={onOpenChange} />, { wrapper });
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(mockFetch).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
