import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "../page-header";

describe("PageHeader", () => {
  it("renders the title", () => {
    render(<PageHeader title="Inventory" />);
    expect(screen.getByRole("heading", { name: "Inventory" })).toBeInTheDocument();
  });

  it("renders an optional action element", () => {
    render(<PageHeader title="Test" action={<button type="button">Add</button>} />);
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("renders an optional description", () => {
    render(<PageHeader title="Test" description="Some description" />);
    expect(screen.getByText("Some description")).toBeInTheDocument();
  });
});
