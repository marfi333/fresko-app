import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";
import { AddEntryDialog } from "../add-entry-dialog";
import { createQueryWrapper } from "@/test/query-wrapper";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("AddEntryDialog", () => {
  it("opens dialog and shows product search", async () => {
    const user = userEvent.setup();
    const { wrapper } = createQueryWrapper();
    render(<AddEntryDialog />, { wrapper });

    await user.click(screen.getByRole("button", { name: /add/i }));

    await waitFor(() => {
      expect(screen.getByLabelText("Product search")).toBeInTheDocument();
    });
  });

  it("shows matching products in dropdown when typing", async () => {
    server.use(
      http.get("/api/products", ({ request }) => {
        const url = new URL(request.url);
        const search = url.searchParams.get("search");
        if (search === "Mi") {
          return HttpResponse.json([
            {
              id: 1,
              name: "Milk",
              unit: "L",
              categoryId: 1,
              householdId: "hh-1",
              createdAt: "2026-05-20T00:00:00.000Z",
            },
          ]);
        }
        return HttpResponse.json([]);
      })
    );

    const user = userEvent.setup();
    const { wrapper } = createQueryWrapper();
    render(<AddEntryDialog />, { wrapper });

    await user.click(screen.getByRole("button", { name: /add/i }));

    const input = await screen.findByLabelText("Product search");
    await user.type(input, "Mi");

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Milk/i })).toBeInTheDocument();
    });
  });

  it("shows entry form after selecting existing product", async () => {
    server.use(
      http.get("/api/products", () =>
        HttpResponse.json([
          {
            id: 1,
            name: "Milk",
            unit: "L",
            categoryId: 1,
            householdId: "hh-1",
            createdAt: "2026-05-20T00:00:00.000Z",
          },
        ])
      )
    );

    const user = userEvent.setup();
    const { wrapper } = createQueryWrapper();
    render(<AddEntryDialog />, { wrapper });

    await user.click(screen.getByRole("button", { name: /add/i }));
    const input = await screen.findByLabelText("Product search");
    await user.type(input, "Mi");

    const option = await screen.findByRole("option", { name: /Milk/i });
    await user.click(option);

    await waitFor(() => {
      expect(screen.getByLabelText("Quantity")).toBeInTheDocument();
    });
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("L")).toBeInTheDocument();
  });

  it("shows unit/category fields for new product", async () => {
    server.use(
      http.get("/api/products", () => HttpResponse.json([])),
      http.get("/api/product-hints", () =>
        HttpResponse.json([
          { id: 1, namePattern: "oat", suggestedUnit: "L", suggestedCategory: "Dairy" },
        ])
      ),
      http.get("/api/categories", () =>
        HttpResponse.json([
          { id: 1, name: "Dairy", householdId: "hh-1" },
          { id: 2, name: "Grains", householdId: "hh-1" },
        ])
      )
    );

    const user = userEvent.setup();
    const { wrapper } = createQueryWrapper();
    render(<AddEntryDialog />, { wrapper });

    await user.click(screen.getByRole("button", { name: /add/i }));
    const input = await screen.findByLabelText("Product search");
    await user.type(input, "Oat milk");

    const createOption = await screen.findByRole("option", {
      name: /Create/i,
    });
    await user.click(createOption);

    await waitFor(() => {
      expect(screen.getByLabelText("Unit")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity")).toBeInTheDocument();
  });

  it("submits entry for existing product with default compartment", async () => {
    let createdEntry = false;
    server.use(
      http.get("/api/products", () =>
        HttpResponse.json([
          {
            id: 1,
            name: "Milk",
            unit: "L",
            categoryId: 1,
            householdId: "hh-1",
            createdAt: "2026-05-20T00:00:00.000Z",
          },
        ])
      ),
      http.post("/api/entries", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        expect(body.productId).toBe(1);
        expect(body.quantity).toBe(2);
        expect(body.compartment).toBe("pantry");
        createdEntry = true;
        return HttpResponse.json(
          { id: 10, ...body, createdBy: "u1", householdId: "hh-1" },
          { status: 201 }
        );
      })
    );

    const user = userEvent.setup();
    const { wrapper } = createQueryWrapper();
    render(<AddEntryDialog />, { wrapper });

    await user.click(screen.getByRole("button", { name: /add/i }));
    const input = await screen.findByLabelText("Product search");
    await user.type(input, "Mi");

    const option = await screen.findByRole("option", { name: /Milk/i });
    await user.click(option);

    const qtyInput = await screen.findByLabelText("Quantity");
    await user.clear(qtyInput);
    await user.type(qtyInput, "2");

    await user.click(screen.getByRole("button", { name: /add entry/i }));

    await waitFor(() => {
      expect(createdEntry).toBe(true);
    });
  });
});
