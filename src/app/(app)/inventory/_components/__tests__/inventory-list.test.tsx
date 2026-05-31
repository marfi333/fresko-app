import { render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/query-wrapper";
import { InventoryList } from "../inventory-list";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("InventoryList", () => {
  it("renders loading skeleton initially", () => {
    const { wrapper } = createQueryWrapper();
    render(<InventoryList compartment="all" />, { wrapper });

    expect(screen.getAllByRole("status")).toHaveLength(5);
  });

  it("renders aggregated products after loading", async () => {
    const { wrapper } = createQueryWrapper();
    render(<InventoryList compartment="all" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("Whole Milk")).toBeInTheDocument();
    });

    expect(screen.getByText("Chicken Breast")).toBeInTheDocument();
    expect(screen.getByText("Bananas")).toBeInTheDocument();
  });

  it("shows empty state when no entries exist", async () => {
    server.use(http.get("/api/entries", () => HttpResponse.json([])));

    const { wrapper } = createQueryWrapper();
    render(<InventoryList compartment="all" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("No items yet")).toBeInTheDocument();
    });
  });

  it("filters entries by compartment", async () => {
    const { wrapper } = createQueryWrapper();
    render(<InventoryList compartment="fridge" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("Whole Milk")).toBeInTheDocument();
    });

    expect(screen.queryByText("Bananas")).not.toBeInTheDocument();
  });
});
