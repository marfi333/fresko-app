"use client";

import { WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";

export type BarcodeOfflineStateProps = {
  onRetry: () => void;
  onCancel?: () => void;
};

export const BarcodeOfflineState = ({ onRetry, onCancel }: BarcodeOfflineStateProps) => {
  return (
    <div className="flex flex-col gap-4">
      <div
        role="alert"
        className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-4"
      >
        <WifiOff
          className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400"
          aria-hidden
        />
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Barcode lookup requires internet</span>
          <span className="text-xs text-muted-foreground">
            Reconnect to scan or look up products by barcode. Other features still work offline.
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="button" className="flex-1" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
};
