import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { seedDefaultCategories } from "@/db/seed";
import { createAuth } from "@/lib/auth";

export const POST = async (request: Request) => {
  const auth = createAuth(new URL(request.url).origin);

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { householdId } = (await request.json()) as { householdId: string };

  if (!householdId) {
    return NextResponse.json({ error: "householdId is required" }, { status: 400 });
  }

  const db = getDb();
  await seedDefaultCategories(db, householdId);

  return NextResponse.json({ success: true });
};
