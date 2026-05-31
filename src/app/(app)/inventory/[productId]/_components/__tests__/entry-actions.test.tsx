import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Entry } from "@/db/schema/entries";
import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/query-wrapper";
import { EntryActions } from "../entry-actions";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const freshEntry: Entry = {
  id: 10,
  productId: 1,
  quantity: 2,
  compartment: "fridge",
  expiryDate: new Date("2030-01-01"),
  createdBy: "user-1",
  householdId: "hh-1",
  createdAt: new Date("2026-05-20"),
};

const expiredEntry: Entry = {
  id: 11,
  productId: 1,
  quantity: 1,
  compartment: "fridge",
  expiryDate: new Date("2020-01-01"),
  createdBy: "user-1",
  householdId: "hh-1",
  createdAt: new Date("2019-12-01"),
};

describe("EntryActions", () => {
  it("shows delete button for any entry", () => {
    const { wrapper } = createQueryWrapper();
    render(<EntryActions entry={freshEntry} />, { wrapper });

    expect(screen.getByRole("button", { name: "Delete entry" })).toBeInTheDocument();
  });

  it("does not show wasted button for non-expired entry", () => {
    const { wrapper } = createQueryWrapper();
    render(<EntryActions entry={freshEntry} />, { wrapper });

    expect(screen.queryByRole("button", { name: /wasted/i })).not.toBeInTheDocument();
  });

  it("shows wasted button for expired entry", () => {
    const { wrapper } = createQueryWrapper();
    render(<EntryActions entry={expiredEntry} />, { wrapper });

    expect(screen.getByRole("button", { name: /wasted/i })).toBeInTheDocument();
  });

  it("opens confirmation dialog and deletes on confirm", async () => {
    let deletedId: number | null = null;
    server.use(
      http.delete("/api/entries/:id", ({ params }) => {
        deletedId = Number(params.id);
        return HttpResponse.json({ success: true });
      })
    );

    const user = userEvent.setup();
    const { wrapper } = createQueryWrapper();
    render(<EntryActions entry={freshEntry} />, { wrapper });

    await user.click(screen.getByRole("button", { name: "Delete entry" }));

    expect(screen.getByText("Delete entry?")).toBeInTheDocument();
    expect(screen.getByText(/permanently remove/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(deletedId).toBe(10);
    });
  });

  it("cancels delete without calling API", async () => {
    const deleteCalled = vi.fn();
    server.use(
      http.delete("/api/entries/:id", () => {
        deleteCalled();
        return HttpResponse.json({ success: true });
      })
    );

    const user = userEvent.setup();
    const { wrapper } = createQueryWrapper();
    render(<EntryActions entry={freshEntry} />, { wrapper });

    await user.click(screen.getByRole("button", { name: "Delete entry" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(deleteCalled).not.toHaveBeenCalled();
  });

  it("calls mark as wasted for expired entry", async () => {
    let wastedId: number | null = null;
    server.use(
      http.delete("/api/entries/:id", ({ params }) => {
        wastedId = Number(params.id);
        return HttpResponse.json({ success: true });
      })
    );

    const user = userEvent.setup();
    const { wrapper } = createQueryWrapper();
    render(<EntryActions entry={expiredEntry} />, { wrapper });

    await user.click(screen.getByRole("button", { name: /wasted/i }));

    await waitFor(() => {
      expect(wastedId).toBe(11);
    });
  });
});
