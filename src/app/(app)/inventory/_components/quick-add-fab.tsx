"use client";

import { Barcode, Pencil, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useScanFlow } from "@/hooks/use-scan-flow";
import { AddEntryDialog } from "./add-entry-dialog";

const BarcodeScannerSheet = dynamic(
  () => import("./barcode-scanner-sheet").then((m) => m.BarcodeScannerSheet),
  { ssr: false }
);

export const QuickAddFab = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    scannerOpen,
    setScannerOpen,
    seededChoice,
    entryDialogOpen,
    openScanner,
    openManual,
    handleScanResult,
    handleEntryDialogOpenChange,
  } = useScanFlow();

  const handleManualClick = () => {
    setMenuOpen(false);
    openManual();
  };

  const handleScanClick = () => {
    setMenuOpen(false);
    openScanner();
  };

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Quick add"
            className="fixed bottom-22 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6"
          >
            <Plus className="h-6 w-6" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" side="top" sideOffset={8} className="w-48 p-1">
          <button
            type="button"
            onClick={handleManualClick}
            className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <Pencil className="h-4 w-4" />
            Add manually
          </button>
          <button
            type="button"
            onClick={handleScanClick}
            className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <Barcode className="h-4 w-4" />
            Scan barcode
          </button>
        </PopoverContent>
      </Popover>

      <BarcodeScannerSheet
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onResult={handleScanResult}
      />

      <AddEntryDialog
        open={entryDialogOpen}
        onOpenChange={handleEntryDialogOpenChange}
        showTrigger={false}
        initialProductChoice={seededChoice}
      />
    </>
  );
};
