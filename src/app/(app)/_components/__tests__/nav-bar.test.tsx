import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NavBar } from "../nav-bar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/inventory",
}));

describe("NavBar", () => {
  it("renders navigation links", () => {
    render(<NavBar />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /inventory/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /shopping/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /analytics/i })).toBeInTheDocument();
  });

  it("highlights the active link", () => {
    render(<NavBar />);
    const inventoryLink = screen.getByRole("link", { name: /inventory/i });
    expect(inventoryLink).toHaveAttribute("aria-current", "page");
  });

  it("has minimum touch targets of 44px", () => {
    render(<NavBar />);
    const links = screen.getAllByRole("link");
    links.forEach((link) => {
      expect(link).toHaveClass("min-h-11");
    });
  });
});
