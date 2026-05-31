"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton-list";
import type { Entry } from "@/db/schema/entries";
import { useEntries } from "@/hooks/use-entries";
import { EditEntryDialog } from "./edit-entry-dialog";
import { EntryActions } from "./entry-actions";

type EntryListProps = {
  productId: number;
};

const COMPARTMENT_LABELS: Record<string, string> = {
  pantry: "Pantry",
  fridge: "Fridge",
  freezer: "Freezer",
};

const EntryRow = ({ entry }: { entry: Entry }) => {
  const expiryDate = entry.expiryDate ? new Date(entry.expiryDate) : null;
  const isExpired = expiryDate && expiryDate < new Date();

  return (
    <div className="flex items-center gap-3 px-6 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{entry.quantity}</span>
          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {COMPARTMENT_LABELS[entry.compartment]}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {expiryDate && (
            <span
              className={`text-xs ${isExpired ? "text-destructive font-medium" : "text-muted-foreground"}`}
            >
              {isExpired ? "Expired" : "Expires"} {expiryDate.toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <EditEntryDialog entry={entry} />
      <EntryActions entry={entry} />
    </div>
  );
};

export const EntryList = ({ productId }: EntryListProps) => {
  const { data: entries, isLoading } = useEntries({ productId });

  if (isLoading) {
    return <SkeletonList count={3} />;
  }

  if (!entries || entries.length === 0) {
    return <EmptyState title="No entries" description="This product has no inventory entries." />;
  }

  return (
    <div className="divide-y divide-border">
      {entries.map((entry) => (
        <EntryRow key={entry.id} entry={entry} />
      ))}
    </div>
  );
};
