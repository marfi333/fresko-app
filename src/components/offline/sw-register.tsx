"use client";

import { useEffect } from "react";

export const ServiceWorkerRegister = () => {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Dev mode: forcibly unregister any worker left over from a prior prod
      // build. A stale SW will intercept dev fetches with cached prod bundle
      // routes and cause requests to hang.
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.unregister();
      });
      return;
    }

    const load = async () => {
      const { Serwist } = await import("@serwist/window");
      const serwist = new Serwist("/sw.js", { scope: "/", type: "classic" });
      await serwist.register();
    };

    void load();
  }, []);

  return null;
};
