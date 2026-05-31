"use client";

import { useState } from "react";
import { Plus, Pencil, Barcode } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AddEntryDialog } from "./add-entry-dialog";

export function QuickAddFab() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  function handleManual() {
    setMenuOpen(false);
    setSheetOpen(true);
  }

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Quick add"
            className="fixed right-4 top-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <Plus className="h-6 w-6" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-48 p-1"
        >
          <button
            type="button"
            onClick={handleManual}
            className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <Pencil className="h-4 w-4" />
            Add manually
          </button>
          <button
            type="button"
            disabled
            className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm text-muted-foreground opacity-60"
            title="Coming soon"
          >
            <Barcode className="h-4 w-4" />
            Scan barcode
          </button>
        </PopoverContent>
      </Popover>

      <AddEntryDialog
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        showTrigger={false}
      />
    </>
  );
}
