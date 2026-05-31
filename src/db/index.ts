import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import SqliteDatabase from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (cached) return cached;
  const path = process.env.DATABASE_PATH ?? "./data/fresko.db";
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const sqlite = new SqliteDatabase(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  cached = drizzle(sqlite, { schema });
  return cached;
}

export type Database = ReturnType<typeof getDb>;
