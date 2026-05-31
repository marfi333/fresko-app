import { vi } from "vitest";

export const mockSession = {
  user: { id: "user-1", email: "test@test.com", name: "Test User" },
  session: { id: "session-1", userId: "user-1" },
};

export const mockOrganization = {
  id: "household-1",
  name: "Test Household",
};

export function setupApiMocks(options?: {
  session?: typeof mockSession | null;
  organizationId?: string | null;
}) {
  const session = options?.session === null ? null : (options?.session ?? mockSession);
  const orgId =
    options?.organizationId === null ? null : (options?.organizationId ?? mockOrganization.id);

  const mockAuth = {
    api: {
      getSession: vi.fn().mockResolvedValue(session),
      getFullOrganization: vi
        .fn()
        .mockResolvedValue(orgId ? { id: orgId, name: "Test Household" } : null),
    },
    handler: vi.fn(),
  };

  vi.mock("@/lib/auth", () => ({
    createAuth: () => mockAuth,
  }));

  return { mockAuth };
}
