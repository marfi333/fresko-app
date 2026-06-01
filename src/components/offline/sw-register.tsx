"use client";

import { useEffect } from "react";

export const ServiceWorkerRegister = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const load = async () => {
      const { Serwist } = await import("@serwist/window");
      const serwist = new Serwist("/sw.js", { scope: "/", type: "classic" });
      await serwist.register();
    };

    void load();
  }, []);

  return null;
};
