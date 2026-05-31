import { describe, expect, it } from "vitest";
import { bucketKey, fillBuckets, parseRange, type Range } from "../range";

describe("parseRange", () => {
  const NOW = new Date("2026-05-31T12:00:00.000Z");

  it("maps 7d to daily granularity since 7 days ago", () => {
    const r = parseRange("7d", NOW);
    expect(r.granularity).toBe("day");
    expect(r.bucketCount).toBe(7);
    expect(r.since.toISOString()).toBe("2026-05-24T12:00:00.000Z");
  });

  it("maps 30d to daily granularity since 30 days ago", () => {
    const r = parseRange("30d", NOW);
    expect(r.granularity).toBe("day");
    expect(r.bucketCount).toBe(30);
  });

  it("maps 90d to weekly granularity", () => {
    const r = parseRange("90d", NOW);
    expect(r.granularity).toBe("week");
    expect(r.bucketCount).toBe(13);
  });

  it("maps 12mo to monthly granularity", () => {
    const r = parseRange("12mo", NOW);
    expect(r.granularity).toBe("month");
    expect(r.bucketCount).toBe(12);
  });

  it("defaults to 30d when given an unknown value", () => {
    const r = parseRange("foo" as Range, NOW);
    expect(r.granularity).toBe("day");
    expect(r.bucketCount).toBe(30);
  });
});

describe("bucketKey", () => {
  it("formats day buckets as YYYY-MM-DD (UTC)", () => {
    expect(bucketKey(new Date("2026-05-31T23:59:59.000Z"), "day")).toBe("2026-05-31");
    expect(bucketKey(new Date("2026-01-01T00:00:00.000Z"), "day")).toBe("2026-01-01");
  });

  it("formats week buckets as YYYY-Www (ISO week)", () => {
    // 2026-01-05 is a Monday → ISO week 02 of 2026
    expect(bucketKey(new Date("2026-01-05T12:00:00.000Z"), "week")).toBe("2026-W02");
  });

  it("formats month buckets as YYYY-MM", () => {
    expect(bucketKey(new Date("2026-05-15T00:00:00.000Z"), "month")).toBe("2026-05");
    expect(bucketKey(new Date("2026-12-31T23:00:00.000Z"), "month")).toBe("2026-12");
  });
});

describe("fillBuckets", () => {
  const NOW = new Date("2026-05-31T12:00:00.000Z");

  it("pads missing daily buckets with zero across the range", () => {
    const range = parseRange("7d", NOW);
    const partial = new Map<string, number>([
      ["2026-05-30", 5],
      ["2026-05-25", 2],
    ]);
    const filled = fillBuckets(partial, range, NOW);
    expect(filled).toHaveLength(7);
    expect(filled[0]).toEqual({ bucket: "2026-05-25", total: 2 });
    expect(filled[5]).toEqual({ bucket: "2026-05-30", total: 5 });
    expect(filled[6]).toEqual({ bucket: "2026-05-31", total: 0 });
    for (const point of filled) {
      expect(typeof point.bucket).toBe("string");
      expect(typeof point.total).toBe("number");
    }
  });

  it("pads missing monthly buckets with zero across 12mo", () => {
    const range = parseRange("12mo", NOW);
    const partial = new Map<string, number>([["2026-05", 7]]);
    const filled = fillBuckets(partial, range, NOW);
    expect(filled).toHaveLength(12);
    const may = filled.find((p) => p.bucket === "2026-05");
    expect(may?.total).toBe(7);
    expect(filled.filter((p) => p.total === 0)).toHaveLength(11);
  });
});
