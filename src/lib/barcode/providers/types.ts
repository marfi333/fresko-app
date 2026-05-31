/**
 * A normalized product record returned by any external lookup. Providers
 * (Open Food Facts, UPCitemdb, …) are responsible for translating their
 * upstream response into this shape.
 *
 * `name` is the only required field. Everything else is best-effort and
 * provider-specific; surface what you can, omit what you can't.
 */
export type ProductData = {
  name: string;
  brands?: string;
  categoriesTags?: string[];
  quantity?: string;
};

/**
 * Outcome of a single provider lookup.
 *
 * - `hit`: provider found this code. `data` is normalized, `raw` is the
 *   verbatim upstream response (cached so future code can mine fields we
 *   don't normalize today).
 * - `miss`: provider confirmed no match. `raw` is the upstream "not found"
 *   body when one exists (for diagnostics) or `null` (for HTTP 404).
 * - `transient`: provider was unreachable, slow, or returned 5xx. Maps to
 *   the HTTP status the route handler should surface to the client. We do
 *   NOT cache these — next scan will retry.
 */
export type ProviderOutcome =
  | { kind: "hit"; data: ProductData; raw: unknown }
  | { kind: "miss"; raw: unknown }
  | { kind: "transient"; status: 502 | 504 };

/**
 * Per-call context passed to every provider. `origin` is the request's
 * origin (used by Open Food Facts in its `User-Agent` etiquette header).
 * `signal` is shared across providers so a single timeout governs the chain.
 */
export type ProviderContext = {
  origin: string;
  signal: AbortSignal;
};

/**
 * A pluggable barcode lookup source. Add a new provider by implementing
 * this interface and registering it in `src/lib/barcode/providers/index.ts`.
 *
 * `id` MUST be unique across providers and is persisted as the `source`
 * column on `barcode_lookups`. Pick something stable — renaming an id
 * orphans existing cache rows (they'll be served as the new id, which is
 * mostly fine, but the audit trail breaks).
 */
export type ProductDataProvider = {
  id: string;
  fetch: (code: string, ctx: ProviderContext) => Promise<ProviderOutcome>;
};
