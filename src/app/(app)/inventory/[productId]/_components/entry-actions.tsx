"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useDeleteEntry, useMarkAsWasted } from "@/hooks/use-entry-mutations";
import type { Entry } from "@/db/schema/entries";

interface EntryActionsProps {
  entry: Entry;
}

export function EntryActions({ entry }: EntryActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteEntry = useDeleteEntry();
  const markAsWasted = useMarkAsWasted();

  const expiryDate = entry.expiryDate ? new Date(entry.expiryDate) : null;
  const isExpired = expiryDate && expiryDate < new Date();

  function handleDelete() {
    deleteEntry.mutate(entry.id, {
      onSuccess: () => setDeleteOpen(false),
    });
  }

  function handleMarkAsWasted() {
    markAsWasted.mutate({ id: entry.id });
  }

  return (
    <div className="flex items-center gap-1">
      {isExpired && (
        <Button
          variant="destructive"
          size="sm"
          className="h-7 text-xs"
          onClick={handleMarkAsWasted}
          disabled={markAsWasted.isPending}
        >
          {markAsWasted.isPending ? "..." : "Wasted"}
        </Button>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            aria-label="Delete entry"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this entry and log it as discarded.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEntry.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteEntry.isPending}
            >
              {deleteEntry.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
