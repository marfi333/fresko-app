import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth";
import { createDb, type Database } from "@/db";

type RequestContextError = { error: NextResponse };
type RequestContextSuccess = {
  db: Database;
  session: { user: { id: string }; session: Record<string, unknown> };
  householdId: string;
  userId: string;
};

export type RequestContext = RequestContextError | RequestContextSuccess;

export async function getRequestContext(
  request: Request
): Promise<RequestContext> {
  const { env } = getCloudflareContext();
  const auth = createAuth(env.DB, new URL(request.url).origin);
  const db = createDb(env.DB);

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const householdId = (session.session as Record<string, unknown>)
    .activeOrganizationId as string | undefined;

  if (!householdId) {
    return {
      error: NextResponse.json(
        { error: "No active household" },
        { status: 403 }
      ),
    };
  }

  return { db, session, householdId, userId: session.user.id };
}
