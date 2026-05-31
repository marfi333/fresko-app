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
  it("renders the pre-filled product name in an editable input", () => {
    const choice: ProductChoice = { type: "new", name: "Acme Whole Milk 2L" };
    const { wrapper } = createQueryWrapper();

    render(<EntryForm productChoice={choice} onSubmit={vi.fn()} onCancel={vi.fn()} />, { wrapper });

    const input = screen.getByLabelText(/product name/i) as HTMLInputElement;
    expect(input.value).toBe("Acme Whole Milk 2L");
  });

  it("blocks submit and shows an error when the product name is empty", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const choice: ProductChoice = { type: "new", name: "" };
    const { wrapper } = createQueryWrapper();

    render(<EntryForm productChoice={choice} onSubmit={onSubmit} onCancel={vi.fn()} />, {
      wrapper,
    });

    await user.click(screen.getByRole("button", { name: /add entry/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/product name is required/i)).toBeInTheDocument();
  });

  it("uses the user-edited name when submitting (overrides initial choice.name)", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const choice: ProductChoice = { type: "new", name: "auto-filled" };
    const { wrapper } = createQueryWrapper();

    render(<EntryForm productChoice={choice} onSubmit={onSubmit} onCancel={vi.fn()} />, {
      wrapper,
    });

    const input = screen.getByLabelText(/product name/i);
    await user.clear(input);
    await user.type(input, "Hand-typed Name");
    await user.click(screen.getByRole("button", { name: /add entry/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.productChoice.name).toBe("Hand-typed Name");
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
