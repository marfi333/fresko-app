import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseBarcodeScanner = vi.fn();

vi.mock("@/hooks/use-barcode-scanner", () => ({
  useBarcodeScanner: (...args: unknown[]) => mockUseBarcodeScanner(...args),
}));

import { BarcodeScannerSheet } from "../barcode-scanner-sheet";

const defaultHookReturn = {
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn(),
  isScanning: false,
  error: null,
};

describe("BarcodeScannerSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBarcodeScanner.mockReturnValue(defaultHookReturn);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a permission-denied fallback with manual entry when error = permission-denied", () => {
    mockUseBarcodeScanner.mockReturnValue({
      ...defaultHookReturn,
      error: "permission-denied",
    });

    render(<BarcodeScannerSheet open={true} onOpenChange={vi.fn()} onResult={vi.fn()} />);

    expect(screen.getByText(/camera/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Barcode")).toBeInTheDocument();
  });

  it("rejects manual entry that is not 8/12/13 digits", async () => {
    const onResult = vi.fn();
    const user = userEvent.setup();
    render(<BarcodeScannerSheet open={true} onOpenChange={vi.fn()} onResult={onResult} />);

    const input = screen.getByLabelText("Barcode");
    await user.type(input, "abc");
    await user.click(screen.getByRole("button", { name: /submit|use barcode/i }));

    expect(onResult).not.toHaveBeenCalled();
  });

  it("forwards a valid manually-entered 13-digit barcode via onResult", async () => {
    const onResult = vi.fn();
    const user = userEvent.setup();
    render(<BarcodeScannerSheet open={true} onOpenChange={vi.fn()} onResult={onResult} />);

    const input = screen.getByLabelText("Barcode");
    await user.type(input, "5901234123457");
    await user.click(screen.getByRole("button", { name: /submit|use barcode/i }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith("5901234123457"));
  });

  it("invokes onOpenChange(false) when the cancel button is pressed", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<BarcodeScannerSheet open={true} onOpenChange={onOpenChange} onResult={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
