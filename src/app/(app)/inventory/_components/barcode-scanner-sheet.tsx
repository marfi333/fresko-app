"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";

const BARCODE_PATTERN = /^(\d{8}|\d{12}|\d{13})$/;

type BarcodeScannerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (code: string) => void;
};

export const BarcodeScannerSheet = ({ open, onOpenChange, onResult }: BarcodeScannerSheetProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);

  const handleResult = (text: string) => {
    onResult(text);
    onOpenChange(false);
  };

  const { start, stop, isScanning, error } = useBarcodeScanner({
    onResult: handleResult,
    videoRef,
  });

  // Ref-callback fires the moment React mounts the <video>. Starting from here
  // (instead of from a useEffect on `open`) avoids the race where the Radix
  // portal hasn't materialised the element yet — which otherwise leaves zxing
  // attaching the stream to an off-DOM phantom <video> and our visible
  // element black.
  const videoCallbackRef = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      if (el && openRef.current) {
        void start();
      }
    },
    [start]
  );

  // When the sheet closes, tear down the scanner and reset manual-entry state.
  useEffect(() => {
    if (open) return;
    stop();
    setManualCode("");
    setManualError(null);
  }, [open, stop]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualCode.trim();
    if (!BARCODE_PATTERN.test(trimmed)) {
      setManualError("Enter 8, 12, or 13 digits");
      return;
    }
    setManualError(null);
    handleResult(trimmed);
  };

  const cameraBlocked = error === "permission-denied" || error === "unavailable";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] max-h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Scan a barcode</SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-4">
          {!cameraBlocked && (
            <div className="relative aspect-[2/1] w-full overflow-hidden rounded-md bg-black">
              {/* biome-ignore lint/a11y/useMediaCaption: live camera preview, no captions available */}
              <video
                ref={videoCallbackRef}
                className="h-full w-full object-cover"
                aria-label="Camera preview"
                autoPlay
                playsInline
                muted
              />
              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
                  Starting camera…
                </div>
              )}
            </div>
          )}

          {cameraBlocked && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
            >
              {error === "permission-denied"
                ? "Camera access was blocked. Enter the barcode manually below."
                : "Camera not available on this device. Enter the barcode manually below."}
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="flex flex-col gap-2">
            <Label htmlFor="manual-barcode">Barcode</Label>
            <Input
              id="manual-barcode"
              inputMode="numeric"
              autoComplete="off"
              value={manualCode}
              onChange={(e) => {
                setManualCode(e.target.value);
                if (manualError) setManualError(null);
              }}
              placeholder="8, 12, or 13 digits"
            />
            {manualError && (
              <p className="text-xs text-destructive" role="alert">
                {manualError}
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Use barcode
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
};
