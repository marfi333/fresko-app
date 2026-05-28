import { describe, it, expect } from "vitest";
import { createAuth } from "../auth";

describe("createAuth", () => {
  it("exports createAuth function", () => {
    expect(createAuth).toBeTypeOf("function");
  });

  it("accepts D1 binding and returns auth instance", () => {
    const mockD1 = {
      prepare: () => ({ bind: () => ({ all: () => Promise.resolve({ results: [] }) }) }),
      batch: () => Promise.resolve([]),
      exec: () => Promise.resolve({ count: 0, duration: 0 }),
      dump: () => Promise.resolve(new ArrayBuffer(0)),
    } as unknown as D1Database;

    const auth = createAuth(mockD1, "http://localhost:3000");
    expect(auth).toBeDefined();
    expect(auth.handler).toBeDefined();
    expect(auth.api).toBeDefined();
  });
});
