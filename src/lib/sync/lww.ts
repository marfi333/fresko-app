export type LWWVerdict = "apply" | "stale";

/**
 * Last-write-wins decision: applies if the client's clientTs is at least as
 * fresh as the server row's updatedAt. Equal timestamps still apply
 * (clientTs >= serverUpdatedAt) to avoid edge cases when client and server
 * clocks tick over the same millisecond.
 *
 * If `clientTs` is undefined, defers to the caller — typically the route
 * skips LWW and applies the mutation (online client behavior).
 */
export const decideLWW = (
  clientTs: number | undefined,
  serverUpdatedAt: Date | number
): LWWVerdict => {
  if (clientTs === undefined) return "apply";
  const serverMs = serverUpdatedAt instanceof Date ? serverUpdatedAt.getTime() : serverUpdatedAt;
  return clientTs >= serverMs ? "apply" : "stale";
};

/**
 * Drains the `clientTs` field off a request body. Returns
 * `{ clientTs, rest }` so callers can pass `rest` straight to validators
 * without leaking the sync field into business logic.
 */
export const extractClientTs = <T extends Record<string, unknown>>(
  body: T
): { clientTs: number | undefined; rest: Omit<T, "clientTs"> } => {
  const { clientTs, ...rest } = body as T & { clientTs?: number };
  return {
    clientTs: typeof clientTs === "number" ? clientTs : undefined,
    rest: rest as Omit<T, "clientTs">,
  };
};
