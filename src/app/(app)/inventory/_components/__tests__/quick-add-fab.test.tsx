import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { server } from "@/mocks/server";
import { createQueryWrapper } from "@/test/query-wrapper";

const mockMutate = vi.fn();
const mockUseBarcodeLookup = vi.fn();

vi.mock("@/hooks/use-barcode-lookup", () => ({
  useBarcodeLookup: () => mockUseBarcodeLookup(),
}));

type ScannerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (code: string) => void;
};

vi.mock("../barcode-scanner-sheet", () => ({
  BarcodeScannerSheet: ({ open, onOpenChange, onResult }: ScannerProps) =>
    open ? (
      <div data-testid="scanner-sheet">
        <button type="button" onClick={() => onResult("5901234123457")}>
          mock scan
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          mock close
        </button>
      </div>
    ) : null,
}));

import { QuickAddFab } from "../quick-add-fab";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

const setupLookup = (
  result: { kind: string; barcode: string; product?: unknown; name?: string } | null
) => {
  mockMutate.mockImplementation((_code, opts?: { onSuccess?: (r: unknown) => void }) => {
    if (result && opts?.onSuccess) opts.onSuccess(result);
  });
  mockUseBarcodeLookup.mockReturnValue({ mutate: mockMutate, isPending: false });
};

describe("QuickAddFab — scan barcode", () => {
  it("shows the scan-barcode menu item enabled (no 'Coming soon')", async () => {
    setupLookup(null);
    const { wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<QuickAddFab />, { wrapper });

    await user.click(screen.getByRole("button", { name: /quick add/i }));
    const scanBtn = await screen.findByRole("button", { name: /scan barcode/i });

    expect(scanBtn).not.toBeDisabled();
    expect(scanBtn.getAttribute("title") ?? "").not.toMatch(/coming soon/i);
  });

  it("opens the BarcodeScannerSheet when the scan-barcode menu item is clicked", async () => {
    setupLookup(null);
    const { wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<QuickAddFab />, { wrapper });

    await user.click(screen.getByRole("button", { name: /quick add/i }));
    await user.click(screen.getByRole("button", { name: /scan barcode/i }));

    expect(await screen.findByTestId("scanner-sheet")).toBeInTheDocument();
  });

  it("triggers the lookup mutation when the scanner reports a barcode", async () => {
    setupLookup({
      kind: "new-blank",
      barcode: "5901234123457",
    });
    const { wrapper } = createQueryWrapper();
    const user = userEvent.setup();
    render(<QuickAddFab />, { wrapper });

    await user.click(screen.getByRole("button", { name: /quick add/i }));
    await user.click(screen.getByRole("button", { name: /scan barcode/i }));
    await user.click(await screen.findByRole("button", { name: /mock scan/i }));

    await waitFor(() =>
      expect(mockMutate).toHaveBeenCalledWith("5901234123457", expect.any(Object))
    );
  });
});
