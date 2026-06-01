import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createQueryWrapper } from "@/test/query-wrapper";
import { PageHeader } from "../page-header";

describe("PageHeader", () => {
  it("renders the title", () => {
    const { wrapper } = createQueryWrapper();
    render(<PageHeader title="Inventory" />, { wrapper });
    expect(screen.getByRole("heading", { name: "Inventory" })).toBeInTheDocument();
  });

  it("renders an optional action element", () => {
    const { wrapper } = createQueryWrapper();
    render(<PageHeader title="Test" action={<button type="button">Add</button>} />, { wrapper });
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("renders an optional description", () => {
    const { wrapper } = createQueryWrapper();
    render(<PageHeader title="Test" description="Some description" />, { wrapper });
    expect(screen.getByText("Some description")).toBeInTheDocument();
  });
});
