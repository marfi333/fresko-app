import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CompartmentTabs } from "../compartment-tabs";

describe("CompartmentTabs", () => {
  it("renders all compartment options", () => {
    render(<CompartmentTabs value="all" onChange={vi.fn()} />);

    expect(screen.getByRole("tab", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Pantry" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Fridge" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Freezer" })).toBeInTheDocument();
  });

  it("highlights the active tab", () => {
    render(<CompartmentTabs value="fridge" onChange={vi.fn()} />);

    const fridgeTab = screen.getByRole("tab", { name: "Fridge" });
    expect(fridgeTab).toHaveAttribute("data-state", "active");
  });

  it("calls onChange when a tab is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CompartmentTabs value="all" onChange={onChange} />);

    await user.click(screen.getByRole("tab", { name: "Pantry" }));
    expect(onChange).toHaveBeenCalledWith("pantry");
  });
});
