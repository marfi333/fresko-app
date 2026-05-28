import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth";
import { createDb } from "@/db";
import { seedDefaultCategories } from "@/db/seed";

export async function POST(request: Request) {
  const { env } = getCloudflareContext();
  const auth = createAuth(env.DB, new URL(request.url).origin);

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { householdId } = (await request.json()) as { householdId: string };

  if (!householdId) {
    return NextResponse.json(
      { error: "householdId is required" },
      { status: 400 }
    );
  }

  const db = createDb(env.DB);
  await seedDefaultCategories(db, householdId);

  return NextResponse.json({ success: true });
}
