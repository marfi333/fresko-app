import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/query-wrapper";
import { EntryForm, type EntryFormData } from "../entry-form";
import type { ProductChoice } from "../product-autocomplete";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("EntryForm with a new-product choice", () => {
  it("displays the pre-filled product name", () => {
    const choice: ProductChoice = { type: "new", name: "Acme Whole Milk 2L" };
    const { wrapper } = createQueryWrapper();

    render(<EntryForm productChoice={choice} onSubmit={vi.fn()} onCancel={vi.fn()} />, { wrapper });

    expect(screen.getByText("Acme Whole Milk 2L")).toBeInTheDocument();
  });

  it("forwards the barcode through onSubmit when productChoice carries one", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const choice: ProductChoice = {
      type: "new",
      name: "Acme Whole Milk 2L",
      barcode: "5901234123457",
    };
    const { wrapper } = createQueryWrapper();

    render(<EntryForm productChoice={choice} onSubmit={onSubmit} onCancel={vi.fn()} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /add entry/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0] as EntryFormData;
    expect(payload.barcode).toBe("5901234123457");
    expect(payload.productChoice.type).toBe("new");
  });

  it("does not include a barcode in the payload when the new-product choice has none", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const choice: ProductChoice = { type: "new", name: "Generic Yogurt" };
    const { wrapper } = createQueryWrapper();

    render(<EntryForm productChoice={choice} onSubmit={onSubmit} onCancel={vi.fn()} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /add entry/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0] as EntryFormData;
    expect(payload.barcode).toBeUndefined();
  });
});
