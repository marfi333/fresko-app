import { render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/query-wrapper";
import { EntryList } from "../entry-list";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("EntryList", () => {
  it("renders loading skeleton initially", () => {
    const { wrapper } = createQueryWrapper();
    render(<EntryList productId={1} />, { wrapper });

    expect(screen.getAllByRole("status")).toHaveLength(3);
  });

  it("renders entries for a product", async () => {
    server.use(
      http.get("/api/entries", () => {
        return HttpResponse.json([
          {
            id: 1,
            productId: 1,
            quantity: 2,
            compartment: "fridge",
            expiryDate: "2026-06-05T00:00:00.000Z",
            createdBy: "user-1",
            householdId: "hh-1",
            createdAt: "2026-05-20T00:00:00.000Z",
          },
          {
            id: 2,
            productId: 1,
            quantity: 1,
            compartment: "pantry",
            expiryDate: null,
            createdBy: "user-1",
            householdId: "hh-1",
            createdAt: "2026-05-21T00:00:00.000Z",
          },
        ]);
      })
    );

    const { wrapper } = createQueryWrapper();
    render(<EntryList productId={1} />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    expect(screen.getByText("Fridge")).toBeInTheDocument();
    expect(screen.getByText("Pantry")).toBeInTheDocument();
  });

  it("shows empty state when no entries", async () => {
    server.use(http.get("/api/entries", () => HttpResponse.json([])));

    const { wrapper } = createQueryWrapper();
    render(<EntryList productId={999} />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("No entries")).toBeInTheDocument();
    });
  });

  it("shows expired badge for past-due entries", async () => {
    server.use(
      http.get("/api/entries", () => {
        return HttpResponse.json([
          {
            id: 1,
            productId: 1,
            quantity: 1,
            compartment: "fridge",
            expiryDate: "2020-01-01T00:00:00.000Z",
            createdBy: "user-1",
            householdId: "hh-1",
            createdAt: "2020-01-01T00:00:00.000Z",
          },
        ]);
      })
    );

    const { wrapper } = createQueryWrapper();
    render(<EntryList productId={1} />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Expired/)).toBeInTheDocument();
    });
  });
});
