import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  process.env.DATABASE_PATH = ":memory:";
});

describe("createAuth", () => {
  it("exports createAuth function", async () => {
    const { createAuth } = await import("../auth");
    expect(createAuth).toBeTypeOf("function");
  });

  it("creates auth instance with sqlite backend", async () => {
    const { createAuth } = await import("../auth");
    const auth = createAuth("http://localhost:3000");
    expect(auth).toBeDefined();
    expect(auth.handler).toBeDefined();
    expect(auth.api).toBeDefined();
  });

  it("auth handler responds to requests", async () => {
    const { createAuth } = await import("../auth");
    const auth = createAuth("http://localhost:3000");

    const request = new Request("http://localhost:3000/api/auth/ok");
    const response = await auth.handler(request);

    expect(response.status).toBe(200);
  });

  it("session endpoint returns null session without auth", async () => {
    const { createAuth } = await import("../auth");
    const auth = createAuth("http://localhost:3000");

    const request = new Request("http://localhost:3000/api/auth/get-session");

    const response = await auth.handler(request);
    const body = await response.json();
    expect(body).toBeNull();
  });
});

describe("auth-client", () => {
  it("exports authClient with expected methods", async () => {
    const { authClient } = await import("../auth-client");
    expect(authClient).toBeDefined();
    expect(authClient.signIn).toBeDefined();
    expect(authClient.signUp).toBeDefined();
    expect(authClient.signOut).toBeDefined();
    expect(authClient.useSession).toBeDefined();
    expect(authClient.organization).toBeDefined();
  });
});
