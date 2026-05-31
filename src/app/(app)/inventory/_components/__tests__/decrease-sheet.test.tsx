import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/query-wrapper";
import { DecreaseSheet } from "../decrease-sheet";
import type { AggregatedProduct } from "../inventory-list";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockItem: AggregatedProduct = {
  product: {
    id: 1,
    name: "Milk",
    unit: "L",
    categoryId: 1,
    householdId: "hh-1",
    barcode: null,
    createdAt: new Date("2026-05-20"),
  },
  totalQuantity: 3,
  entries: [],
  compartments: new Set(["fridge"]),
  nearestExpiry: null,
};

describe("DecreaseSheet", () => {
  it("renders nothing when item is null", () => {
    const { wrapper } = createQueryWrapper();
    const { container } = render(
      <DecreaseSheet item={null} open={false} onOpenChange={() => {}} />,
      { wrapper }
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows product name and current stock", () => {
    const { wrapper } = createQueryWrapper();
    render(<DecreaseSheet item={mockItem} open={true} onOpenChange={() => {}} />, { wrapper });

    expect(screen.getByText("Use Milk")).toBeInTheDocument();
    expect(screen.getByText("Current stock: 3 L")).toBeInTheDocument();
  });

  it("submits decrease request with entered amount", async () => {
    let decreasedWith: Record<string, unknown> | null = null;
    server.use(
      http.post("/api/entries/decrease", async ({ request }) => {
        decreasedWith = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ decreasedTotal: 1.5 });
      })
    );

    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    const { wrapper } = createQueryWrapper();
    render(<DecreaseSheet item={mockItem} open={true} onOpenChange={onOpenChange} />, { wrapper });

    const input = screen.getByLabelText("Amount to use");
    await user.clear(input);
    await user.type(input, "1.5");

    await user.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(decreasedWith).toEqual({ productId: 1, amount: 1.5 });
    });

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
