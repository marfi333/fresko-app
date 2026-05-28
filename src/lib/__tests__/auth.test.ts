import { describe, it, expect, vi } from "vitest";
import { createAuth } from "../auth";

function createMockD1(): D1Database {
  return {
    prepare: () => ({
      bind: (..._args: unknown[]) => ({
        all: () => Promise.resolve({ results: [], success: true, meta: {} }),
        first: () => Promise.resolve(null),
        run: () => Promise.resolve({ success: true, meta: {} }),
        raw: () => Promise.resolve([]),
      }),
      all: () => Promise.resolve({ results: [], success: true, meta: {} }),
      first: () => Promise.resolve(null),
      run: () => Promise.resolve({ success: true, meta: {} }),
      raw: () => Promise.resolve([]),
    }),
    batch: () => Promise.resolve([]),
    exec: () => Promise.resolve({ count: 0, duration: 0 }),
    dump: () => Promise.resolve(new ArrayBuffer(0)),
  } as unknown as D1Database;
}

describe("createAuth", () => {
  it("exports createAuth function", () => {
    expect(createAuth).toBeTypeOf("function");
  });

  it("creates auth instance with D1 binding", () => {
    const mockD1 = createMockD1();
    const auth = createAuth(mockD1, "http://localhost:3000");
    expect(auth).toBeDefined();
    expect(auth.handler).toBeDefined();
    expect(auth.api).toBeDefined();
  });

  it("auth handler responds to requests", async () => {
    const mockD1 = createMockD1();
    const auth = createAuth(mockD1, "http://localhost:3000");

    const request = new Request("http://localhost:3000/api/auth/ok");
    const response = await auth.handler(request);

    expect(response.status).toBe(200);
  });

  it("sign-up endpoint rejects invalid input", async () => {
    const mockD1 = createMockD1();
    const auth = createAuth(mockD1, "http://localhost:3000");

    const request = new Request(
      "http://localhost:3000/api/auth/sign-up/email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "", password: "" }),
      }
    );

    const response = await auth.handler(request);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("sign-in endpoint rejects non-existent user", async () => {
    const mockD1 = createMockD1();
    const auth = createAuth(mockD1, "http://localhost:3000");

    const request = new Request(
      "http://localhost:3000/api/auth/sign-in/email",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "nobody@test.com",
          password: "password123",
        }),
      }
    );

    const response = await auth.handler(request);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("session endpoint returns null session without auth", async () => {
    const mockD1 = createMockD1();
    const auth = createAuth(mockD1, "http://localhost:3000");

    const request = new Request(
      "http://localhost:3000/api/auth/get-session"
    );

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
