import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SwipeRow, SwipeRowProvider } from "../swipe-row";

describe("SwipeRow", () => {
  it("renders the children content", () => {
    render(
      <SwipeRowProvider>
        <SwipeRow actions={<button type="button">Edit</button>}>
          <div>Row content</div>
        </SwipeRow>
      </SwipeRowProvider>
    );
    expect(screen.getByText("Row content")).toBeInTheDocument();
  });

  it("renders action buttons in the action panel", () => {
    render(
      <SwipeRowProvider>
        <SwipeRow
          actions={
            <>
              <button type="button">Edit</button>
              <button type="button">Delete</button>
            </>
          }
        >
          <div>Row content</div>
        </SwipeRow>
      </SwipeRowProvider>
    );
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("invokes the action handler when an action button is clicked", async () => {
    const onEdit = vi.fn();
    render(
      <SwipeRowProvider>
        <SwipeRow
          actions={
            <button type="button" onClick={onEdit}>
              Edit
            </button>
          }
        >
          <div>Row content</div>
        </SwipeRow>
      </SwipeRowProvider>
    );
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("renders without a provider (graceful fallback, no crash)", () => {
    render(
      <SwipeRow actions={<button type="button">Edit</button>}>
        <div>Standalone</div>
      </SwipeRow>
    );
    expect(screen.getByText("Standalone")).toBeInTheDocument();
  });

  it("passes through children unchanged when disabled", () => {
    render(
      <SwipeRowProvider>
        <SwipeRow disabled actions={<button type="button">Edit</button>}>
          <div>Plain row</div>
        </SwipeRow>
      </SwipeRowProvider>
    );
    expect(screen.getByText("Plain row")).toBeInTheDocument();
    // When disabled, no action buttons should be visible (panel not rendered)
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });
});
