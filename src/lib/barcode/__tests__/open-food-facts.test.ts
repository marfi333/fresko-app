import { describe, expect, it } from "vitest";
import {
  buildOffUrl,
  buildOffUserAgent,
  normalizeOffResponse,
} from "@/lib/barcode/open-food-facts";

describe("buildOffUrl", () => {
  it("targets the v2 product endpoint with the requested fields", () => {
    const url = buildOffUrl("5901234123457");
    expect(url).toContain("https://world.openfoodfacts.org/api/v2/product/5901234123457.json");
    expect(url).toContain("fields=product_name,brands,categories_tags,quantity");
  });

  it("URL-encodes the barcode", () => {
    const url = buildOffUrl("12 34");
    expect(url).toContain("12%2034");
  });
});

describe("buildOffUserAgent", () => {
  it("includes 'Fresko', version, origin, and 'scan'", () => {
    const ua = buildOffUserAgent("https://app.example.com");
    expect(ua).toContain("Fresko");
    expect(ua).toContain("https://app.example.com");
    expect(ua).toContain("scan");
  });
});

describe("normalizeOffResponse", () => {
  it("returns null when status !== 1", () => {
    expect(normalizeOffResponse({ status: 0 })).toBeNull();
  });

  it("returns null when product is missing", () => {
    expect(normalizeOffResponse({ status: 1 })).toBeNull();
  });

  it("returns null when product_name is missing or blank", () => {
    expect(normalizeOffResponse({ status: 1, product: { product_name: "" } })).toBeNull();
    expect(normalizeOffResponse({ status: 1, product: { product_name: "   " } })).toBeNull();
  });

  it("normalizes a hit into camelCase", () => {
    const result = normalizeOffResponse({
      status: 1,
      product: {
        product_name: "Whole Milk",
        brands: "Acme",
        categories_tags: ["en:dairy", "en:milk"],
        quantity: "1L",
      },
    });
    expect(result).toEqual({
      name: "Whole Milk",
      brands: "Acme",
      categoriesTags: ["en:dairy", "en:milk"],
      quantity: "1L",
    });
  });

  it("omits optional fields when absent", () => {
    const result = normalizeOffResponse({
      status: 1,
      product: { product_name: "Salt" },
    });
    expect(result).toEqual({ name: "Salt" });
  });

  it("filters non-string entries from categories_tags", () => {
    const result = normalizeOffResponse({
      status: 1,
      product: { product_name: "Apple", categories_tags: ["en:fruit", 123, null] },
    });
    expect(result?.categoriesTags).toEqual(["en:fruit"]);
  });
});
