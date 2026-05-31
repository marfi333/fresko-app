"use client";

import { useCallback, useState } from "react";
import type { ProductChoice } from "@/app/(app)/inventory/_components/product-autocomplete";
import { type BarcodeLookupResult, useBarcodeLookup } from "@/hooks/use-barcode-lookup";

const toProductChoice = (result: BarcodeLookupResult): ProductChoice => {
  if (result.kind === "existing") return { type: "existing", product: result.product };
  if (result.kind === "new-from-off") {
    return { type: "new", name: result.name, barcode: result.barcode };
  }
  // new-blank or error → empty new with barcode preserved
  return { type: "new", name: "", barcode: result.barcode };
};

type UseScanFlowReturn = {
  scannerOpen: boolean;
  setScannerOpen: (open: boolean) => void;
  seededChoice: ProductChoice | null;
  entryDialogOpen: boolean;
  openScanner: () => void;
  openManual: () => void;
  handleScanResult: (code: string) => void;
  handleEntryDialogOpenChange: (open: boolean) => void;
};

export const useScanFlow = (): UseScanFlowReturn => {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [seededChoice, setSeededChoice] = useState<ProductChoice | null>(null);

  const lookup = useBarcodeLookup();

  const openManual = useCallback(() => {
    setSeededChoice(null);
    setEntryDialogOpen(true);
  }, []);

  const openScanner = useCallback(() => {
    setScannerOpen(true);
  }, []);

  const handleScanResult = useCallback(
    (code: string) => {
      lookup.mutate(code, {
        onSuccess: (result) => {
          setScannerOpen(false);
          setSeededChoice(toProductChoice(result));
          setEntryDialogOpen(true);
        },
      });
    },
    [lookup]
  );

  const handleEntryDialogOpenChange = useCallback((open: boolean) => {
    setEntryDialogOpen(open);
    if (!open) setSeededChoice(null);
  }, []);

  return {
    scannerOpen,
    setScannerOpen,
    seededChoice,
    entryDialogOpen,
    openScanner,
    openManual,
    handleScanResult,
    handleEntryDialogOpenChange,
  };
};
