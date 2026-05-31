import { createAuth } from "@/lib/auth";

async function handleAuthRequest(request: Request) {
  const auth = createAuth(new URL(request.url).origin);
  return auth.handler(request);
}

export const GET = handleAuthRequest;
export const POST = handleAuthRequest;
