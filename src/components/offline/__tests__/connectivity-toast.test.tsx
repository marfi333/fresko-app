import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ConnectivityToast } from "../connectivity-toast";

const setOnline = (value: boolean) => {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => value,
  });
};

const fireConnectivityEvent = (name: "online" | "offline") => {
  window.dispatchEvent(new Event(name));
};

beforeEach(() => {
  setOnline(true);
});

afterEach(() => {
  // Sonner persists toasts across renders — clean DOM helps.
  document.body.innerHTML = "";
});

describe("ConnectivityToast", () => {
  it("does not fire any toast when mounting online without a transition", async () => {
    render(<ConnectivityToast />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/you are offline/i)).toBeNull();
    expect(screen.queryByText(/back online/i)).toBeNull();
  });

  it("shows persistent 'You are offline' when mounted while offline", async () => {
    setOnline(false);
    render(<ConnectivityToast />);
    expect(await screen.findByText(/you are offline/i)).toBeInTheDocument();
  });

  it("shows 'You are offline' on online → offline transition", async () => {
    render(<ConnectivityToast />);
    act(() => {
      setOnline(false);
      fireConnectivityEvent("offline");
    });
    expect(await screen.findByText(/you are offline/i)).toBeInTheDocument();
  });

  it("shows 'Back online' on offline → online transition and dismisses the offline toast", async () => {
    render(<ConnectivityToast />);
    act(() => {
      setOnline(false);
      fireConnectivityEvent("offline");
    });
    await screen.findByText(/you are offline/i);

    act(() => {
      setOnline(true);
      fireConnectivityEvent("online");
    });

    expect(await screen.findByText(/back online/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/you are offline/i)).toBeNull();
    });
  });
});
