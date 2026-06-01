"use client";

import { Check, WifiOff } from "lucide-react";
import { useEffect, useRef } from "react";
import { Toaster, toast } from "sonner";

import { useOnline } from "@/hooks/use-online";

const OFFLINE_TOAST_ID = "offline-connectivity";
const ONLINE_TOAST_ID = "online-connectivity";

/**
 * Mounts a Sonner toast region and shows transition toasts:
 *   - persistent "You are offline" while offline
 *   - auto-dismissing "Back online" when connectivity returns
 *
 * Mount once in the app shell.
 */
export const ConnectivityToast = () => {
  const { online } = useOnline();
  const wasOffline = useRef(false);
  const initialized = useRef(false);

  useEffect(() => {
    // First render: don't fire any transition toast — only react to changes.
    if (!initialized.current) {
      initialized.current = true;
      // If we mount while already offline, surface the persistent toast.
      if (!online) {
        wasOffline.current = true;
        toast(
          <span className="flex items-center gap-2">
            <WifiOff className="size-4" aria-hidden />
            You are offline
          </span>,
          {
            id: OFFLINE_TOAST_ID,
            description: "Changes will sync when reconnected.",
            duration: Number.POSITIVE_INFINITY,
          }
        );
      }
      return;
    }

    if (!online) {
      wasOffline.current = true;
      toast.dismiss(ONLINE_TOAST_ID);
      toast(
        <span className="flex items-center gap-2">
          <WifiOff className="size-4" aria-hidden />
          You are offline
        </span>,
        {
          id: OFFLINE_TOAST_ID,
          description: "Changes will sync when reconnected.",
          duration: Number.POSITIVE_INFINITY,
        }
      );
      return;
    }

    if (online && wasOffline.current) {
      wasOffline.current = false;
      toast.dismiss(OFFLINE_TOAST_ID);
      toast.success(
        <span className="flex items-center gap-2">
          <Check className="size-4" aria-hidden />
          Back online
        </span>,
        {
          id: ONLINE_TOAST_ID,
          duration: 3_000,
        }
      );
    }
  }, [online]);

  return <Toaster position="bottom-center" closeButton={false} richColors />;
};
