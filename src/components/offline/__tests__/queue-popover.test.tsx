import "fake-indexeddb/auto";

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { closeMirrorDb, resetMirrorDbForTests } from "@/lib/offline/db";
import { enqueueMutation } from "@/lib/offline/outbox";
import { createQueryWrapper } from "@/test/query-wrapper";

import { QueuePopover } from "../queue-popover";

const setOnline = (value: boolean) => {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => value,
  });
};

const fireConnectivityEvent = (name: "online" | "offline") => {
  window.dispatchEvent(new Event(name));
};

const fetchMock = vi.fn();

beforeEach(async () => {
  await resetMirrorDbForTests();
  setOnline(true);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(async () => {
  await closeMirrorDb();
  vi.unstubAllGlobals();
});

describe("QueuePopover", () => {
  it("renders the bare badge (no popover trigger) when nothing is queued", async () => {
    const { wrapper } = createQueryWrapper();
    const { container } = render(<QueuePopover />, { wrapper });
    // Badge itself is null when online + empty + no transition. Container empty.
    await new Promise((r) => setTimeout(r, 5));
    expect(container.querySelector("button")).toBeNull();
  });

  it("renders a clickable trigger when items are queued", async () => {
    const { wrapper } = createQueryWrapper();
    render(<QueuePopover />, { wrapper });

    act(() => {
      setOnline(false);
      fireConnectivityEvent("offline");
    });

    await act(async () => {
      await enqueueMutation({
        entity: "entries",
        op: "create",
        payload: { name: "Milk" },
      });
    });

    const trigger = await screen.findByRole("button", { name: /1 pending change/i });
    expect(trigger).toBeInTheDocument();
  });

  it("opens the popover and lists queued items", async () => {
    const user = userEvent.setup();
    const { wrapper } = createQueryWrapper();
    render(<QueuePopover />, { wrapper });

    act(() => {
      setOnline(false);
      fireConnectivityEvent("offline");
    });

    await act(async () => {
      await enqueueMutation({
        entity: "entries",
        op: "create",
        payload: { name: "Milk" },
      });
      await enqueueMutation({
        entity: "shoppingItems",
        op: "delete",
        serverId: 7,
        payload: {},
      });
    });

    const trigger = await screen.findByRole("button", { name: /2 pending changes/i });
    await user.click(trigger);

    expect(await screen.findByText(/pending changes/i)).toBeInTheDocument();
    expect(screen.getByText(/add inventory: milk/i)).toBeInTheDocument();
    expect(screen.getByText(/delete shopping/i)).toBeInTheDocument();
  });

  it("Retry button is disabled when offline", async () => {
    const user = userEvent.setup();
    const { wrapper } = createQueryWrapper();
    render(<QueuePopover />, { wrapper });

    act(() => {
      setOnline(false);
      fireConnectivityEvent("offline");
    });

    await act(async () => {
      await enqueueMutation({ entity: "entries", op: "create", payload: { name: "X" } });
    });

    const trigger = await screen.findByRole("button", { name: /1 pending change/i });
    await user.click(trigger);

    const retry = await screen.findByRole("button", { name: /retry now/i });
    expect(retry).toBeDisabled();
  });

  it("Retry triggers the sync runner", async () => {
    const user = userEvent.setup();
    const { wrapper } = createQueryWrapper();
    render(<QueuePopover />, { wrapper });

    fetchMock.mockReturnValueOnce(
      Promise.resolve(
        new Response(JSON.stringify({ results: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    // Enqueue while online so retry button is enabled.
    await act(async () => {
      await enqueueMutation({ entity: "entries", op: "create", payload: { name: "X" } });
    });

    const trigger = await screen.findByRole("button", { name: /1 pending change/i });
    await user.click(trigger);

    const retry = await screen.findByRole("button", { name: /retry now/i });
    await user.click(retry);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/api/sync/replay");
  });
});
