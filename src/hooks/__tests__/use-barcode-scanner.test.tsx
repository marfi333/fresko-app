import { act, renderHook, waitFor } from "@testing-library/react";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockStop = vi.fn();
const mockDecodeFromConstraints = vi.fn();
const mockReaderCtor = vi.fn();

vi.mock("@zxing/browser", () => {
  class BrowserMultiFormatReader {
    constructor(...args: unknown[]) {
      mockReaderCtor(...args);
    }
    decodeFromConstraints(...args: unknown[]) {
      return mockDecodeFromConstraints(...args);
    }
  }
  return { BrowserMultiFormatReader };
});

import { useBarcodeScanner } from "../use-barcode-scanner";

describe("useBarcodeScanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDecodeFromConstraints.mockResolvedValue({ stop: mockStop });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not start scanning until start() is called", () => {
    const { result } = renderHook(() => useBarcodeScanner({ onResult: vi.fn() }));
    expect(mockDecodeFromConstraints).not.toHaveBeenCalled();
    expect(result.current.isScanning).toBe(false);
  });

  it("starts scanning with rear-camera constraints when start() is called", async () => {
    const videoEl = document.createElement("video");
    const { result } = renderHook(() =>
      useBarcodeScanner({ onResult: vi.fn(), videoRef: { current: videoEl } })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(mockDecodeFromConstraints).toHaveBeenCalledTimes(1);
    const [constraints, videoArg] = mockDecodeFromConstraints.mock.calls[0];
    expect(constraints).toEqual({
      video: { facingMode: { ideal: "environment" } },
    });
    expect(videoArg).toBe(videoEl);
    expect(result.current.isScanning).toBe(true);
  });

  it("invokes onResult and stops the scanner on first successful decode", async () => {
    const onResult = vi.fn();
    const { result } = renderHook(() =>
      useBarcodeScanner({
        onResult,
        videoRef: { current: document.createElement("video") },
      })
    );

    let capturedCallback: ((res: unknown, err: unknown) => void) | undefined;
    mockDecodeFromConstraints.mockImplementation(async (_c, _v, cb) => {
      capturedCallback = cb;
      return { stop: mockStop };
    });

    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      capturedCallback?.({ getText: () => "5901234123457" }, undefined);
    });

    expect(onResult).toHaveBeenCalledWith("5901234123457");
    expect(mockStop).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.isScanning).toBe(false));
  });

  it("exposes a permission error when getUserMedia / decodeFromConstraints rejects with NotAllowedError", async () => {
    const onResult = vi.fn();
    mockDecodeFromConstraints.mockRejectedValue(
      Object.assign(new Error("denied"), { name: "NotAllowedError" })
    );

    const { result } = renderHook(() =>
      useBarcodeScanner({
        onResult,
        videoRef: { current: document.createElement("video") },
      })
    );

    await act(async () => {
      await result.current.start();
    });

    await waitFor(() => expect(result.current.error).toBe("permission-denied"));
    expect(result.current.isScanning).toBe(false);
  });

  it("exposes a generic error for other failures", async () => {
    const onResult = vi.fn();
    mockDecodeFromConstraints.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() =>
      useBarcodeScanner({
        onResult,
        videoRef: { current: document.createElement("video") },
      })
    );

    await act(async () => {
      await result.current.start();
    });

    await waitFor(() => expect(result.current.error).toBe("unavailable"));
  });

  it("releases the scanner via stop()", async () => {
    const { result } = renderHook(() =>
      useBarcodeScanner({
        onResult: vi.fn(),
        videoRef: { current: document.createElement("video") },
      })
    );

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.stop();
    });

    expect(mockStop).toHaveBeenCalledTimes(1);
    expect(result.current.isScanning).toBe(false);
  });

  it("releases the scanner on unmount", async () => {
    const { result, unmount } = renderHook(() =>
      useBarcodeScanner({
        onResult: vi.fn(),
        videoRef: { current: document.createElement("video") },
      })
    );

    await act(async () => {
      await result.current.start();
    });

    unmount();

    expect(mockStop).toHaveBeenCalledTimes(1);
  });

  it("constructs the reader with hints restricting to EAN_13/EAN_8/UPC_A/UPC_E", () => {
    renderHook(() => useBarcodeScanner({ onResult: vi.fn(), videoRef: { current: null } }));

    expect(mockReaderCtor).toHaveBeenCalled();
    const [hints] = mockReaderCtor.mock.calls[0];
    expect(hints).toBeInstanceOf(Map);
    const formats = (hints as Map<unknown, unknown>).get(DecodeHintType.POSSIBLE_FORMATS);
    expect(formats).toEqual(
      expect.arrayContaining([
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
      ])
    );
  });
});
