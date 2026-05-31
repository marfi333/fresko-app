import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Product } from "@/db/schema/products";
import type { AggregatedProduct } from "../inventory-list";
import { ProductRow } from "../product-row";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const baseProduct: Product = {
  id: 1,
  name: "Whole Milk",
  unit: "L",
  categoryId: null,
  householdId: "hh-1",
  barcode: null,
  createdAt: new Date(),
};

const makeItem = (overrides: Partial<AggregatedProduct> = {}): AggregatedProduct => ({
  product: baseProduct,
  totalQuantity: 2,
  entries: [],
  compartments: new Set(["fridge"]),
  nearestExpiry: null,
  ...overrides,
});

describe("ProductRow", () => {
  it("renders product name and quantity", () => {
    render(<ProductRow item={makeItem()} showCompartments={false} />);
    expect(screen.getByText("Whole Milk")).toBeInTheDocument();
    expect(screen.getByText("2 L")).toBeInTheDocument();
  });

  it("renders a plus button when onAdd is provided", () => {
    render(<ProductRow item={makeItem()} showCompartments={false} onAdd={vi.fn()} />);
    expect(screen.getByRole("button", { name: /add whole milk/i })).toBeInTheDocument();
  });

  it("calls onAdd with the item when the plus button is clicked", async () => {
    const onAdd = vi.fn();
    const item = makeItem();
    render(<ProductRow item={item} showCompartments={false} onAdd={onAdd} />);
    await userEvent.click(screen.getByRole("button", { name: /add whole milk/i }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(item);
  });

  it("does not render plus button when onAdd is not provided", () => {
    render(<ProductRow item={makeItem()} showCompartments={false} />);
    expect(screen.queryByRole("button", { name: /add whole milk/i })).not.toBeInTheDocument();
  });

  it("renders minus, name+qty, plus in that order", () => {
    render(
      <ProductRow item={makeItem()} showCompartments={false} onDecrease={vi.fn()} onAdd={vi.fn()} />
    );
    const buttons = screen.getAllByRole("button");
    const minusBtn = screen.getByRole("button", { name: /decrease whole milk/i });
    const plusBtn = screen.getByRole("button", { name: /add whole milk/i });
    expect(buttons.indexOf(minusBtn)).toBeLessThan(buttons.indexOf(plusBtn));
  });
});
