"use client";

import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useOnline } from "@/hooks/use-online";
import { usePendingCount } from "@/hooks/use-pending-count";
import { usePendingItems } from "@/hooks/use-pending-items";
import { drainAndInvalidate } from "@/lib/offline/query-bridge";
import type { MirrorEntity, OutboxOp, OutboxRecord } from "@/lib/offline/types";
import { OfflineBadge } from "./offline-badge";

const ENTITY_LABEL: Record<MirrorEntity, string> = {
  entries: "Inventory",
  categories: "Category",
  shoppingItems: "Shopping",
};

const OP_LABEL: Record<OutboxOp, string> = {
  create: "Add",
  update: "Edit",
  delete: "Delete",
};

const formatRelative = (ms: number): string => {
  const diffSec = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
};

const itemSummary = (record: OutboxRecord): string => {
  const verb = OP_LABEL[record.op];
  const entity = ENTITY_LABEL[record.entity];
  const name = (record.payload?.name as string | undefined) ?? "";
  return name ? `${verb} ${entity.toLowerCase()}: ${name}` : `${verb} ${entity.toLowerCase()}`;
};

export const QueuePopover = () => {
  const items = usePendingItems();
  const { count } = usePendingCount();
  const { online } = useOnline();
  const [retrying, setRetrying] = useState(false);
  const queryClient = useQueryClient();

  // The badge already hides when there's nothing to show. Mirror that here so
  // the popover trigger is only present when there is queued work or we just
  // came back online (badge handles the "Back online" flash itself).
  if (count === 0) return <OfflineBadge />;

  const handleRetry = async () => {
    if (retrying || !online) return;
    setRetrying(true);
    try {
      await drainAndInvalidate(queryClient);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${count} pending ${count === 1 ? "change" : "changes"}; click to view`}
          className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
        >
          <OfflineBadge />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-sm font-semibold">Pending changes</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRetry}
            disabled={!online || retrying}
            aria-label="Retry now"
          >
            <RefreshCw className={retrying ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden />
            <span className="ml-1.5">Retry</span>
          </Button>
        </div>
        <ul className="-mx-1 max-h-72 space-y-1 overflow-y-auto py-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-md px-2 py-1.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{itemSummary(item)}</div>
                {item.lastError && (
                  <div className="truncate text-xs text-rose-700">{item.lastError}</div>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatRelative(item.clientTs)}
              </span>
            </li>
          ))}
        </ul>
        {!online && (
          <p className="pt-2 text-xs text-muted-foreground">
            Changes will sync automatically when you&rsquo;re back online.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
};
