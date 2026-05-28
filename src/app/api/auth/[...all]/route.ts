import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth";

async function handleAuthRequest(request: Request) {
  const { env } = getCloudflareContext();
  const auth = createAuth(env.DB, new URL(request.url).origin);
  return auth.handler(request);
}

export const GET = handleAuthRequest;
export const POST = handleAuthRequest;
