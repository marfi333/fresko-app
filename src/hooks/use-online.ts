"use client";

import { useEffect, useState } from "react";

export type OnlineState = {
  online: boolean;
  since: number;
};

const initialState = (): OnlineState => {
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  return { online, since: 0 };
};

export const useOnline = (): OnlineState => {
  const [state, setState] = useState<OnlineState>(initialState);

  useEffect(() => {
    const handle = (online: boolean) => {
      setState((prev) => (prev.online === online ? prev : { online, since: Date.now() }));
    };

    const handleOnline = () => handle(true);
    const handleOffline = () => handle(false);

    handle(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return state;
};
