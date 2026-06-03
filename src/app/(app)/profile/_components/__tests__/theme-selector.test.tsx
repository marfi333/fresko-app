import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setTheme = vi.fn();
let currentTheme = "system";

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: currentTheme, setTheme }),
}));

import { ThemeSelector } from "../theme-selector";

beforeEach(() => {
  setTheme.mockClear();
  currentTheme = "system";
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("ThemeSelector", () => {
  it("renders three segments: Light, Dark, System", async () => {
    render(<ThemeSelector />);
    const tabs = await screen.findAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(screen.getByRole("tab", { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /system/i })).toBeInTheDocument();
  });

  it("marks the active theme with aria-selected", async () => {
    currentTheme = "dark";
    render(<ThemeSelector />);
    const darkTab = await screen.findByRole("tab", { name: /dark/i });
    expect(darkTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /light/i })).toHaveAttribute("aria-selected", "false");
  });

  it("calls setTheme when a segment is clicked", async () => {
    const user = userEvent.setup();
    render(<ThemeSelector />);
    await user.click(await screen.findByRole("tab", { name: /dark/i }));
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("renders a stable placeholder before mount to avoid hydration mismatch", () => {
    // Before the mount effect resolves the test renders synchronously; the
    // component must still render the three tabs (no null flash that would
    // shift layout). aria-selected may be absent until mounted.
    render(<ThemeSelector />);
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });
});
