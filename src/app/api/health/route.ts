import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    db.run(sql`select 1`);
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unhealthy";
    return NextResponse.json({ status: "error", message }, { status: 503 });
  }
}
