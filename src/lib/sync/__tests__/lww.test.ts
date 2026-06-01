import { describe, expect, it } from "vitest";

import { decideLWW, extractClientTs } from "../lww";

describe("decideLWW", () => {
  it("returns 'apply' when clientTs is undefined (online client path)", () => {
    expect(decideLWW(undefined, new Date(1_000))).toBe("apply");
  });

  it("returns 'apply' when clientTs > serverUpdatedAt", () => {
    expect(decideLWW(2_000, new Date(1_000))).toBe("apply");
  });

  it("returns 'apply' when clientTs equals serverUpdatedAt", () => {
    expect(decideLWW(1_000, new Date(1_000))).toBe("apply");
  });

  it("returns 'stale' when clientTs < serverUpdatedAt", () => {
    expect(decideLWW(500, new Date(1_000))).toBe("stale");
  });

  it("accepts a number for serverUpdatedAt", () => {
    expect(decideLWW(2_000, 1_000)).toBe("apply");
    expect(decideLWW(500, 1_000)).toBe("stale");
  });
});

describe("extractClientTs", () => {
  it("returns clientTs when present", () => {
    const { clientTs, rest } = extractClientTs({ name: "Milk", clientTs: 1_234 });
    expect(clientTs).toBe(1_234);
    expect(rest).toEqual({ name: "Milk" });
  });

  it("returns undefined when missing", () => {
    const { clientTs, rest } = extractClientTs({ name: "Milk" });
    expect(clientTs).toBeUndefined();
    expect(rest).toEqual({ name: "Milk" });
  });

  it("ignores non-number clientTs", () => {
    const { clientTs } = extractClientTs({ clientTs: "1234" as unknown as number });
    expect(clientTs).toBeUndefined();
  });
});
