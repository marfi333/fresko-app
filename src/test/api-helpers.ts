import { vi } from "vitest";

export const mockSession = {
  user: { id: "user-1", email: "test@test.com", name: "Test User" },
  session: { id: "session-1", userId: "user-1" },
};

export const mockOrganization = {
  id: "household-1",
  name: "Test Household",
};

export function createMockD1WithResults(results: unknown[] = []) {
  return {
    prepare: () => ({
      bind: (..._args: unknown[]) => ({
        all: () => Promise.resolve({ results, success: true, meta: {} }),
        first: () => Promise.resolve(results[0] ?? null),
        run: () =>
          Promise.resolve({ success: true, meta: { last_row_id: 1 } }),
        raw: () => Promise.resolve(results),
      }),
      all: () => Promise.resolve({ results, success: true, meta: {} }),
      first: () => Promise.resolve(results[0] ?? null),
      run: () => Promise.resolve({ success: true, meta: { last_row_id: 1 } }),
      raw: () => Promise.resolve(results),
    }),
    batch: (stmts: unknown[]) =>
      Promise.resolve(
        (stmts as unknown[]).map(() => ({
          results,
          success: true,
          meta: {},
        }))
      ),
    exec: () => Promise.resolve({ count: 0, duration: 0 }),
    dump: () => Promise.resolve(new ArrayBuffer(0)),
  } as unknown as D1Database;
}

export function setupApiMocks(options?: {
  session?: typeof mockSession | null;
  organizationId?: string | null;
}) {
  const session = options?.session === null ? null : (options?.session ?? mockSession);
  const orgId = options?.organizationId === null ? null : (options?.organizationId ?? mockOrganization.id);

  const mockAuth = {
    api: {
      getSession: vi.fn().mockResolvedValue(session),
      getFullOrganization: vi.fn().mockResolvedValue(
        orgId ? { id: orgId, name: "Test Household" } : null
      ),
    },
    handler: vi.fn(),
  };

  vi.mock("@opennextjs/cloudflare", () => ({
    getCloudflareContext: () => ({
      env: { DB: createMockD1WithResults() },
    }),
  }));

  vi.mock("@/lib/auth", () => ({
    createAuth: () => mockAuth,
  }));

  return { mockAuth };
}
