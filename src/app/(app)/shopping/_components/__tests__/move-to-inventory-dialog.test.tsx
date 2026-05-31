import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MoveToInventoryDialog } from "../move-to-inventory-dialog";

describe("MoveToInventoryDialog", () => {
  it("does not render when closed", () => {
    render(
      <MoveToInventoryDialog
        open={false}
        itemName="Milk"
        defaultQuantity={1}
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    );
    expect(screen.queryByText(/Move to inventory/i)).not.toBeInTheDocument();
  });

  it("renders item name and confirm/cancel when open", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <MoveToInventoryDialog
        open
        itemName="Eggs"
        defaultQuantity={6}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );
    expect(screen.getByText("Move to inventory")).toBeInTheDocument();
    expect(screen.getByText(/Eggs/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Confirm/i }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ compartment: "pantry" }));
  });

  it("calls onCancel when Cancel is pressed", async () => {
    const onCancel = vi.fn();
    render(
      <MoveToInventoryDialog
        open
        itemName="Bread"
        defaultQuantity={1}
        onCancel={onCancel}
        onConfirm={() => {}}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
