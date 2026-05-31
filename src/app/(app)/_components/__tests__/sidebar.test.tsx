import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "../sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/inventory",
}));

describe("Sidebar", () => {
  it("renders navigation links", () => {
    render(<Sidebar />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /inventory/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /shopping/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /analytics/i })).toBeInTheDocument();
  });

  it("highlights the active link", () => {
    render(<Sidebar />);
    const inventoryLink = screen.getByRole("link", { name: /inventory/i });
    expect(inventoryLink).toHaveAttribute("aria-current", "page");
  });

  it("displays the app name", () => {
    render(<Sidebar />);
    expect(screen.getByText("Fresko")).toBeInTheDocument();
  });
});
