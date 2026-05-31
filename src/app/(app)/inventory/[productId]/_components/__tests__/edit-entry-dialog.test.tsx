import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Entry } from "@/db/schema/entries";
import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/query-wrapper";
import { EditEntryDialog } from "../edit-entry-dialog";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockEntry: Entry = {
  id: 5,
  productId: 1,
  quantity: 2.5,
  compartment: "fridge",
  expiryDate: new Date("2026-06-15"),
  createdBy: "user-1",
  householdId: "hh-1",
  createdAt: new Date("2026-05-20"),
};

describe("EditEntryDialog", () => {
  it("renders edit button", () => {
    const { wrapper } = createQueryWrapper();
    render(<EditEntryDialog entry={mockEntry} />, { wrapper });

    expect(screen.getByRole("button", { name: "Edit entry" })).toBeInTheDocument();
  });

  it("opens dialog with pre-filled values on click", async () => {
    const user = userEvent.setup();
    const { wrapper } = createQueryWrapper();
    render(<EditEntryDialog entry={mockEntry} />, { wrapper });

    await user.click(screen.getByRole("button", { name: "Edit entry" }));

    expect(screen.getByText("Edit entry")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity")).toHaveValue(2.5);
    expect(screen.getByLabelText("Expiry date")).toHaveValue("2026-06-15");
  });

  it("submits updated values", async () => {
    let patchedWith: Record<string, unknown> | null = null;
    server.use(
      http.patch("/api/entries/:id", async ({ request, params }) => {
        patchedWith = {
          id: Number(params.id),
          ...((await request.json()) as Record<string, unknown>),
        };
        return HttpResponse.json({ ...mockEntry, quantity: 4 });
      })
    );

    const user = userEvent.setup();
    const { wrapper } = createQueryWrapper();
    render(<EditEntryDialog entry={mockEntry} />, { wrapper });

    await user.click(screen.getByRole("button", { name: "Edit entry" }));

    const quantityInput = screen.getByLabelText("Quantity");
    await user.clear(quantityInput);
    await user.type(quantityInput, "4");

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(patchedWith).toEqual({
        id: 5,
        quantity: 4,
        compartment: "fridge",
        expiryDate: "2026-06-15",
      });
    });
  });

  it("does not submit with invalid quantity", async () => {
    const patchCalled = vi.fn();
    server.use(
      http.patch("/api/entries/:id", async () => {
        patchCalled();
        return HttpResponse.json(mockEntry);
      })
    );

    const user = userEvent.setup();
    const { wrapper } = createQueryWrapper();
    render(<EditEntryDialog entry={mockEntry} />, { wrapper });

    await user.click(screen.getByRole("button", { name: "Edit entry" }));

    const quantityInput = screen.getByLabelText("Quantity");
    await user.clear(quantityInput);
    await user.type(quantityInput, "0");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(patchCalled).not.toHaveBeenCalled();
  });
});
