"use client";

import { useEffect } from "react";

export const ServiceWorkerRegister = () => {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Register in BOTH dev and prod. The SW uses NetworkOnly for mutating
    // /api/* requests so offline-write semantics are unchanged, and
    // NetworkFirst for navigations so offline page transitions work after a
    // page has been visited once.
    const load = async () => {
      const { Serwist } = await import("@serwist/window");
      const serwist = new Serwist("/sw.js", {
        scope: "/",
        type: "classic",
        updateViaCache: "none",
      });
      await serwist.register();
    };

    void load();
  }, []);

  return null;
};
