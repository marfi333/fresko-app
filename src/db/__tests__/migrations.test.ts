import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import SqliteDatabase from "better-sqlite3";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = resolve(__dirname, "../../../drizzle");

type ColumnInfo = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
};

type IndexInfo = {
  seq: number;
  name: string;
  unique: number;
  origin: string;
  partial: number;
};

type IndexListEntry = {
  name: string;
  sql: string | null;
};

const buildMigratedDb = () => {
  const db = new SqliteDatabase(":memory:");
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      db.exec(stmt);
    }
  }
  return db;
};

describe("products schema migrations", () => {
  it("creates a nullable barcode TEXT column on products", () => {
    const db = buildMigratedDb();
    const cols = db.prepare("PRAGMA table_info(products)").all() as ColumnInfo[];

    const barcode = cols.find((c) => c.name === "barcode");
    expect(barcode).toBeDefined();
    expect(barcode?.type.toUpperCase()).toBe("TEXT");
    expect(barcode?.notnull).toBe(0);
  });

  it("creates a partial unique index on (household_id, barcode) where barcode is not null", () => {
    const db = buildMigratedDb();
    const indexes = db.prepare("PRAGMA index_list(products)").all() as IndexInfo[];
    const uniquePartial = indexes.filter((i) => i.unique === 1 && i.partial === 1);

    expect(uniquePartial.length).toBeGreaterThan(0);

    const candidates = db
      .prepare(
        "SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'products' AND sql IS NOT NULL"
      )
      .all() as IndexListEntry[];

    const match = candidates.find(
      (c) =>
        c.sql !== null &&
        /UNIQUE/i.test(c.sql) &&
        /household_id/i.test(c.sql) &&
        /barcode/i.test(c.sql) &&
        /WHERE/i.test(c.sql) &&
        /barcode("|`|\b)\s*IS\s+NOT\s+NULL/i.test(c.sql)
    );
    expect(match).toBeDefined();
  });
});
