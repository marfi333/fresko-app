"use client";

import { Check, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useOnline } from "@/hooks/use-online";
import { usePendingCount } from "@/hooks/use-pending-count";
import { cn } from "@/lib/utils";

const BACK_ONLINE_MS = 2_500;

export type OfflineBadgeProps = {
  className?: string;
};

export const OfflineBadge = ({ className }: OfflineBadgeProps) => {
  const { online } = useOnline();
  const { count, failed } = usePendingCount();
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [mounted, setMounted] = useState(false);
  const wasOffline = useRef(false);

  // Avoid SSR/CSR mismatch: server renders assuming `online: true`, client may
  // boot offline. Render nothing until after hydration.
  useEffect(() => setMounted(true), []);

  // Flash a "Back online" success state when transitioning offline → online.
  // Only when the queue stays empty across the transition; if any items are
  // queued, the syncing state takes precedence.
  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setShowBackOnline(false);
      return;
    }
    if (!wasOffline.current) return;
    if (count > 0) return;
    wasOffline.current = false;
    setShowBackOnline(true);
    const timer = window.setTimeout(() => setShowBackOnline(false), BACK_ONLINE_MS);
    return () => window.clearTimeout(timer);
  }, [online, count]);

  if (!mounted) return null;
  if (online && count === 0 && !showBackOnline) return null;

  if (online && showBackOnline) {
    return (
      <span
        aria-live="polite"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900",
          className
        )}
      >
        <Check className="size-3.5" aria-hidden />
        Back online
      </span>
    );
  }

  const ariaLabel = online
    ? `Syncing ${count} pending change${count === 1 ? "" : "s"}`
    : count > 0
      ? `Offline — ${count} pending change${count === 1 ? "" : "s"}`
      : "Offline";

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      data-failed={failed > 0 ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        online
          ? "bg-amber-100 text-amber-900"
          : failed > 0
            ? "bg-rose-100 text-rose-900"
            : "bg-muted text-foreground/80",
        className
      )}
    >
      <WifiOff className="size-3.5" aria-hidden />
      {online ? "Syncing" : "Offline"}
      {count > 0 && (
        <>
          <span aria-hidden>·</span>
          <span>{count}</span>
        </>
      )}
    </span>
  );
};
