"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

export const LIGHT_THEME_COLOR = "#faf8f5";
export const DARK_THEME_COLOR = "#2a2520";

export const ThemeColorMeta = () => {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const color = resolvedTheme === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", color);
  }, [resolvedTheme]);

  return null;
};
