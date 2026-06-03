import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let resolvedTheme = "light";

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme }),
}));

import { DARK_THEME_COLOR, LIGHT_THEME_COLOR, ThemeColorMeta } from "../theme-color-meta";

const getMetaContent = () =>
  document.querySelector('meta[name="theme-color"]')?.getAttribute("content");

beforeEach(() => {
  resolvedTheme = "light";
  for (const el of document.querySelectorAll('meta[name="theme-color"]')) {
    el.remove();
  }
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("ThemeColorMeta", () => {
  it("sets the meta theme-color to the cream value when resolved theme is light", async () => {
    resolvedTheme = "light";
    render(<ThemeColorMeta />);
    await waitFor(() => expect(getMetaContent()).toBe(LIGHT_THEME_COLOR));
  });

  it("sets the meta theme-color to the dark value when resolved theme is dark", async () => {
    resolvedTheme = "dark";
    render(<ThemeColorMeta />);
    await waitFor(() => expect(getMetaContent()).toBe(DARK_THEME_COLOR));
  });

  it("creates the meta tag if one does not already exist", async () => {
    expect(document.querySelector('meta[name="theme-color"]')).toBeNull();
    render(<ThemeColorMeta />);
    await waitFor(() => expect(document.querySelector('meta[name="theme-color"]')).not.toBeNull());
  });

  it("reuses an existing meta tag rather than creating a duplicate", async () => {
    const existing = document.createElement("meta");
    existing.setAttribute("name", "theme-color");
    document.head.appendChild(existing);
    render(<ThemeColorMeta />);
    await waitFor(() => expect(getMetaContent()).toBe(LIGHT_THEME_COLOR));
    expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1);
  });
});
