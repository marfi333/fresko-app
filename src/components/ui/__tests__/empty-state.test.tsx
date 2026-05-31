import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "../empty-state";

describe("EmptyState", () => {
  it("renders the title and description", () => {
    render(<EmptyState title="No items" description="Add your first item" />);
    expect(screen.getByText("No items")).toBeInTheDocument();
    expect(screen.getByText("Add your first item")).toBeInTheDocument();
  });

  it("renders an optional action element", () => {
    render(
      <EmptyState
        title="Empty"
        description="Nothing here"
        action={<button type="button">Create</button>}
      />
    );
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });
});
