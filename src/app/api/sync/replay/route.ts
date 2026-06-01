import { NextResponse } from "next/server";

import { getRequestContext } from "@/lib/api-utils";
import { type ReplayItem, replayBatch } from "@/lib/sync/replay";

export const POST = async (request: Request) => {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const body = (await request.json()) as { items?: ReplayItem[] };
  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: "items must be an array" }, { status: 400 });
  }

  const results = await replayBatch(
    { db: ctx.db, householdId: ctx.householdId, userId: ctx.userId },
    body.items
  );

  return NextResponse.json({ results });
};
