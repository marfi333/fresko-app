import { type EnqueueInput, enqueueMutation } from "./outbox";

/**
 * True when the runtime believes there is no network connectivity. SSR-safe.
 */
export const isOffline = (): boolean =>
  typeof navigator !== "undefined" && navigator.onLine === false;

/**
 * Wrap a fetch-style mutation so it transparently enqueues to the offline
 * outbox when navigator.onLine is false (or when the network call throws a
 * TypeError, the standard "fetch failed" signal).
 *
 * Returns:
 *   { kind: "applied", value: T }      — server returned a real response
 *   { kind: "enqueued", clientTs }     — request was queued for later replay
 *
 * Callers decide what UI affordance to show for the enqueued case
 * (often: success toast + skip navigation that depends on a server id).
 */
export type MutationOutcome<T> =
  | { kind: "applied"; value: T }
  | { kind: "enqueued"; clientTs: number };

export type MutateOrEnqueueArgs<T> = EnqueueInput & {
  /** Online path. Returns the parsed server response. */
  online: () => Promise<T>;
};

export const mutateOrEnqueue = async <T>({
  online,
  ...enqueueArgs
}: MutateOrEnqueueArgs<T>): Promise<MutationOutcome<T>> => {
  if (isOffline()) {
    const record = await enqueueMutation(enqueueArgs);
    return { kind: "enqueued", clientTs: record.clientTs };
  }

  try {
    const value = await online();
    return { kind: "applied", value };
  } catch (err) {
    // Network failure mid-request — fall through to enqueue. Don't swallow
    // logical errors (e.g. validation 400s); those throw a different shape
    // (Error with a message) and the caller's online() function should have
    // already converted non-OK responses to thrown errors.
    if (err instanceof TypeError) {
      const record = await enqueueMutation(enqueueArgs);
      return { kind: "enqueued", clientTs: record.clientTs };
    }
    throw err;
  }
};
