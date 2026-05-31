import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import SqliteDatabase from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import {
  type CachedHit,
  type CachedMiss,
  readCache,
  TTL_MS,
  writeCacheHit,
  writeCacheMiss,
} from "../cache";

const MIGRATIONS_DIR = resolve(__dirname, "../../../../drizzle");

type Db = ReturnType<typeof drizzle<typeof schema>>;

const buildDb = (): Db => {
  const sqlite = new SqliteDatabase(":memory:");
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) sqlite.exec(stmt);
  }
  return drizzle(sqlite, { schema });
};

const CODE = "5901234123457";

describe("barcode-lookup cache", () => {
  let db: Db;
  beforeEach(() => {
    db = buildDb();
  });

  it("returns kind: 'none' for an unseen barcode", async () => {
    const result = await readCache(db, CODE);
    expect(result).toEqual({ kind: "none" });
  });

  it("round-trips a hit and reports it as fresh", async () => {
    const now = new Date("2026-05-31T00:00:00Z");
    await writeCacheHit(
      db,
      {
        barcode: CODE,
        source: "off",
        name: "Whole Milk",
        brands: "Acme",
        categoriesTags: ["en:dairy", "en:milk"],
        quantity: "2L",
      },
      now
    );

    const result = (await readCache(db, CODE, now)) as CachedHit;
    expect(result.kind).toBe("hit");
    expect(result.name).toBe("Whole Milk");
    expect(result.categoriesTags).toEqual(["en:dairy", "en:milk"]);
    expect(result.source).toBe("off");
    expect(result.fresh).toBe(true);
  });

  it("round-trips a miss and reports it as fresh", async () => {
    const now = new Date("2026-05-31T00:00:00Z");
    await writeCacheMiss(db, CODE, now);

    const result = (await readCache(db, CODE, now)) as CachedMiss;
    expect(result).toEqual({ kind: "miss", fresh: true });
  });

  it("marks an entry as stale once older than TTL_MS", async () => {
    const fetchedAt = new Date("2026-04-01T00:00:00Z");
    await writeCacheHit(db, { barcode: CODE, source: "off", name: "Old Milk" }, fetchedAt);

    const wayLater = new Date(fetchedAt.getTime() + TTL_MS + 1000);
    const result = (await readCache(db, CODE, wayLater)) as CachedHit;
    expect(result.fresh).toBe(false);
  });

  it("upserts on subsequent writes (replaces hit with newer hit)", async () => {
    await writeCacheHit(db, { barcode: CODE, source: "off", name: "First" });
    await writeCacheHit(db, { barcode: CODE, source: "upcitemdb", name: "Second" });

    const result = (await readCache(db, CODE)) as CachedHit;
    expect(result.name).toBe("Second");
    expect(result.source).toBe("upcitemdb");
  });

  it("upserts a hit over a previous miss when fallback finds the product", async () => {
    await writeCacheMiss(db, CODE);
    await writeCacheHit(db, { barcode: CODE, source: "upcitemdb", name: "Found Later" });

    const result = (await readCache(db, CODE)) as CachedHit;
    expect(result.kind).toBe("hit");
    expect(result.name).toBe("Found Later");
  });

  it("round-trips the raw upstream payload", async () => {
    const raw = {
      status: 1,
      product: { product_name: "Whole Milk", custom_field: "preserved" },
    };
    await writeCacheHit(db, {
      barcode: CODE,
      source: "off",
      name: "Whole Milk",
      rawResponse: raw,
    });

    const result = (await readCache(db, CODE)) as CachedHit;
    expect(result.rawResponse).toEqual(raw);
  });

  it("persists raw payload on a miss", async () => {
    const raw = { off: { status: 0 }, upcitemdb: { code: "NO_MATCH" } };
    await writeCacheMiss(db, CODE, raw);

    const result = (await readCache(db, CODE)) as CachedMiss & { rawResponse?: unknown };
    expect(result.kind).toBe("miss");
    // CachedMiss doesn't expose rawResponse — but the row should have it.
    // Verify via a follow-up read that the row exists with the expected blob.
    const row = await db.query.barcodeLookups.findFirst({
      where: (t, { eq }) => eq(t.barcode, CODE),
    });
    expect(row?.rawResponse).toEqual(raw);
  });
});
