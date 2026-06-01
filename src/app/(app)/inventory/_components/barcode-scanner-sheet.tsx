"use client";

import { Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { WebHaptics } from "web-haptics";
import { BarcodeOfflineState } from "@/components/barcode/barcode-offline-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { useOnline } from "@/hooks/use-online";

const BARCODE_PATTERN = /^(\d{8}|\d{12}|\d{13})$/;
const SUCCESS_DELAY_MS = 600;

type BarcodeScannerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult: (code: string) => void;
};

let hapticsInstance: WebHaptics | null = null;
const triggerSuccessHaptic = () => {
  if (typeof window === "undefined") return;
  if (!WebHaptics.isSupported) return;
  if (!hapticsInstance) hapticsInstance = new WebHaptics();
  void hapticsInstance.trigger("success");
};

export const BarcodeScannerSheet = ({ open, onOpenChange, onResult }: BarcodeScannerSheetProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleResult = useCallback(
    (text: string) => {
      // Already capturing a code → ignore late callbacks
      if (scannedCode) return;
      setScannedCode(text);
      triggerSuccessHaptic();
      dismissTimerRef.current = setTimeout(() => {
        onResult(text);
        onOpenChange(false);
      }, SUCCESS_DELAY_MS);
    },
    [scannedCode, onResult, onOpenChange]
  );

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

  // When the sheet closes, tear down the scanner and reset state.
  useEffect(() => {
    if (open) return;
    stop();
    setManualCode("");
    setManualError(null);
    setScannedCode(null);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, [open, stop]);

  // Cancel pending dismiss timer on unmount to avoid setState-after-unmount.
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  // Once we have a scanned code, kill the scanner so it doesn't keep decoding.
  useEffect(() => {
    if (scannedCode) stop();
  }, [scannedCode, stop]);

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

  const isSubmitting = scannedCode !== null;

  const cameraBlocked = error === "permission-denied" || error === "unavailable";
  const { online } = useOnline();
  const [retryNonce, setRetryNonce] = useState(0);

  // When offline AND the sheet is open, stop the camera so it doesn't keep
  // streaming; the barcode lookup endpoint can't be reached anyway.
  useEffect(() => {
    if (open && !online) stop();
  }, [open, online, stop]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] max-h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Scan a barcode</SheetTitle>
        </SheetHeader>

        {!online ? (
          <div className="mt-4">
            <BarcodeOfflineState
              key={retryNonce}
              onRetry={() => setRetryNonce((n) => n + 1)}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {!cameraBlocked && !scannedCode && (
              <div className="relative aspect-2/1 w-full overflow-hidden rounded-md bg-black">
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

            {scannedCode && (
              <div
                className="flex items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
                role="status"
                aria-live="polite"
              >
                <Check className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Got it!</span>
                  <span className="font-mono text-xs text-muted-foreground">{scannedCode}</span>
                </div>
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
                disabled={isSubmitting}
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
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  Use barcode
                </Button>
              </div>
            </form>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
