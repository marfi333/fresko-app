import { describe, expect, it } from "vitest";
import { buildUpcUrl, normalizeUpcResponse } from "../upcitemdb";

describe("buildUpcUrl", () => {
  it("targets the prod trial endpoint with upc= query param", () => {
    expect(buildUpcUrl("5901234123457")).toBe(
      "https://api.upcitemdb.com/prod/trial/lookup?upc=5901234123457"
    );
  });

  it("URL-encodes the code", () => {
    expect(buildUpcUrl("12 34")).toContain("upc=12%2034");
  });
});

describe("normalizeUpcResponse", () => {
  it("returns null when code !== 'OK'", () => {
    expect(normalizeUpcResponse({ code: "NO_MATCH", items: [] })).toBeNull();
  });

  it("returns null when items is empty", () => {
    expect(normalizeUpcResponse({ code: "OK", items: [] })).toBeNull();
  });

  it("returns null when title is missing or blank", () => {
    expect(normalizeUpcResponse({ code: "OK", items: [{ title: "" }] })).toBeNull();
    expect(normalizeUpcResponse({ code: "OK", items: [{ title: "  " }] })).toBeNull();
  });

  it("normalizes a hit into camelCase", () => {
    const result = normalizeUpcResponse({
      code: "OK",
      items: [
        {
          title: "Coca-Cola Original 0.5L",
          brand: "Coca-Cola",
          category: "Beverages > Soft Drinks",
          size: "0.5L",
        },
      ],
    });
    expect(result).toEqual({
      name: "Coca-Cola Original 0.5L",
      brands: "Coca-Cola",
      categoriesTags: ["Beverages > Soft Drinks"],
      quantity: "0.5L",
    });
  });

  it("omits optional fields when absent", () => {
    expect(normalizeUpcResponse({ code: "OK", items: [{ title: "Salt" }] })).toEqual({
      name: "Salt",
    });
  });
});
