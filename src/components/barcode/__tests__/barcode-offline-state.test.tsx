import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BarcodeOfflineState } from "../barcode-offline-state";

describe("BarcodeOfflineState", () => {
  it("shows the 'requires internet' message", () => {
    render(<BarcodeOfflineState onRetry={vi.fn()} />);
    expect(screen.getByText(/barcode lookup requires internet/i)).toBeInTheDocument();
  });

  it("calls onRetry when Try again is clicked", async () => {
    const onRetry = vi.fn();
    render(<BarcodeOfflineState onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("renders Cancel only when onCancel is provided", () => {
    const { rerender } = render(<BarcodeOfflineState onRetry={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /cancel/i })).toBeNull();
    rerender(<BarcodeOfflineState onRetry={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const onCancel = vi.fn();
    render(<BarcodeOfflineState onRetry={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("uses role='alert' so screen readers announce the offline state", () => {
    render(<BarcodeOfflineState onRetry={vi.fn()} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
