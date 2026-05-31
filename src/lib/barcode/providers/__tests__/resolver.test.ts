import { describe, expect, it, vi } from "vitest";
import { resolveProductData } from "../index";
import type { ProductDataProvider, ProviderOutcome } from "../types";

const provider = (id: string, outcome: ProviderOutcome): ProductDataProvider => ({
  id,
  fetch: vi.fn().mockResolvedValue(outcome),
});

const ctx = { origin: "http://localhost:3000", signal: new AbortController().signal };

describe("resolveProductData", () => {
  it("returns the first hit and short-circuits remaining providers", async () => {
    const second = provider("alpha", {
      kind: "hit",
      data: { name: "Alpha" },
      raw: { from: "alpha" },
    });
    const third = provider("beta", { kind: "miss", raw: null });

    const result = await resolveProductData("123", ctx, [second, third]);

    expect(result).toEqual({
      kind: "hit",
      providerId: "alpha",
      data: { name: "Alpha" },
      raw: { from: "alpha" },
    });
    expect(third.fetch).not.toHaveBeenCalled();
  });

  it("walks past misses to find a later hit", async () => {
    const a = provider("a", { kind: "miss", raw: { reason: "no match" } });
    const b = provider("b", {
      kind: "hit",
      data: { name: "Found in B" },
      raw: { from: "b" },
    });

    const result = await resolveProductData("123", ctx, [a, b]);

    expect(a.fetch).toHaveBeenCalledOnce();
    expect(b.fetch).toHaveBeenCalledOnce();
    expect(result.kind).toBe("hit");
    if (result.kind === "hit") expect(result.providerId).toBe("b");
  });

  it("aggregates raw payloads by provider id when every provider misses", async () => {
    const a = provider("a", { kind: "miss", raw: { aBody: 1 } });
    const b = provider("b", { kind: "miss", raw: { bBody: 2 } });

    const result = await resolveProductData("123", ctx, [a, b]);

    expect(result).toEqual({
      kind: "miss",
      rawByProvider: { a: { aBody: 1 }, b: { bBody: 2 } },
    });
  });

  it("halts the chain on a transient outcome (does not fall through to the next provider)", async () => {
    const a = provider("a", { kind: "transient", status: 502 });
    const b = provider("b", { kind: "hit", data: { name: "B" }, raw: null });

    const result = await resolveProductData("123", ctx, [a, b]);

    expect(b.fetch).not.toHaveBeenCalled();
    expect(result).toEqual({ kind: "transient", providerId: "a", status: 502 });
  });

  it("preserves transient status code (504 vs 502)", async () => {
    const a = provider("a", { kind: "transient", status: 504 });
    const result = await resolveProductData("123", ctx, [a]);
    expect(result.kind).toBe("transient");
    if (result.kind === "transient") expect(result.status).toBe(504);
  });

  it("reports an empty providers list as 'all missed'", async () => {
    const result = await resolveProductData("123", ctx, []);
    expect(result).toEqual({ kind: "miss", rawByProvider: {} });
  });
});
