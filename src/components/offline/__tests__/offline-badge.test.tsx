import "fake-indexeddb/auto";

import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { closeMirrorDb, resetMirrorDbForTests } from "@/lib/offline/db";
import { enqueueMutation } from "@/lib/offline/outbox";

import { OfflineBadge } from "../offline-badge";

const setOnline = (value: boolean) => {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => value,
  });
};

const fireConnectivityEvent = (name: "online" | "offline") => {
  window.dispatchEvent(new Event(name));
};

beforeEach(async () => {
  await resetMirrorDbForTests();
  setOnline(true);
});

afterEach(async () => {
  await closeMirrorDb();
});

describe("OfflineBadge", () => {
  it("renders nothing when online with no queued items and no recent transition", async () => {
    // Mount while online but force initial state to avoid flashing the success
    // state (online + count 0). Setting online=false then back to true would
    // trigger the success flash; since we mount fresh online, expect nothing.
    setOnline(true);
    const { container } = render(<OfflineBadge />);
    // Wait for initial outbox refresh; should still be empty.
    await new Promise((r) => setTimeout(r, 5));
    expect(container.firstChild).toBeNull();
  });

  it("shows 'Offline' when navigator goes offline", async () => {
    render(<OfflineBadge />);
    act(() => {
      setOnline(false);
      fireConnectivityEvent("offline");
    });
    expect(await screen.findByText(/offline/i)).toBeInTheDocument();
  });

  it("shows 'Offline · N' when offline AND items are queued", async () => {
    render(<OfflineBadge />);
    act(() => {
      setOnline(false);
      fireConnectivityEvent("offline");
    });
    await act(async () => {
      await enqueueMutation({ entity: "entries", op: "create", payload: {} });
      await enqueueMutation({ entity: "entries", op: "create", payload: {} });
    });
    await waitFor(() => {
      expect(screen.getByText(/offline/i)).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  it("renders 'Syncing N' while online with pending items (after offline → online)", async () => {
    render(<OfflineBadge />);
    act(() => {
      setOnline(false);
      fireConnectivityEvent("offline");
    });
    await act(async () => {
      await enqueueMutation({ entity: "entries", op: "create", payload: {} });
    });
    await waitFor(() => expect(screen.getByText(/offline/i)).toBeInTheDocument());

    act(() => {
      setOnline(true);
      fireConnectivityEvent("online");
    });
    await waitFor(() => {
      expect(screen.getByText(/syncing/i)).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  it("flashes 'Back online' on offline → online with empty queue", async () => {
    render(<OfflineBadge />);
    act(() => {
      setOnline(false);
      fireConnectivityEvent("offline");
    });
    await waitFor(() => expect(screen.getByText(/offline/i)).toBeInTheDocument());

    act(() => {
      setOnline(true);
      fireConnectivityEvent("online");
    });
    expect(await screen.findByText(/back online/i)).toBeInTheDocument();
  });

  it("has aria-live for screen reader announcements", async () => {
    render(<OfflineBadge />);
    act(() => {
      setOnline(false);
      fireConnectivityEvent("offline");
    });
    const badge = await screen.findByText(/offline/i);
    const root = badge.closest("[aria-live]");
    expect(root).not.toBeNull();
    expect(root?.getAttribute("aria-live")).toBe("polite");
  });
});
