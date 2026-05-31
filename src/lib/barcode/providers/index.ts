import { openFoodFactsProvider } from "./off";
import type { ProductData, ProductDataProvider, ProviderContext } from "./types";
import { upcitemdbProvider } from "./upcitemdb";

/**
 * Ordered list of barcode lookup providers. The resolver walks them in
 * order, returning the first hit. To add a new source: implement
 * `ProductDataProvider`, place it in this folder, and append it here.
 *
 * Order matters. Put the most authoritative / lowest-latency source first.
 * Open Food Facts is community-maintained and global; UPCitemdb has
 * complementary commercial coverage (US & some EU SKUs OFF lacks).
 */
export const productDataProviders: ProductDataProvider[] = [
  openFoodFactsProvider,
  upcitemdbProvider,
];

export type ResolveResult =
  | {
      kind: "hit";
      providerId: string;
      data: ProductData;
      raw: unknown;
    }
  | {
      kind: "miss";
      /** raw payloads keyed by provider id, for diagnostics & cache */
      rawByProvider: Record<string, unknown>;
    }
  | {
      kind: "transient";
      providerId: string;
      status: 502 | 504;
    };

/**
 * Resolve a barcode by walking the registered providers in order.
 *
 * - First `hit` wins and short-circuits the chain.
 * - First `transient` halts the chain (do not cache, surface to client).
 * - All `miss` outcomes accumulate; if every provider misses, return a
 *   single `miss` with raw payloads keyed by provider id.
 *
 * Allowing transients to halt the chain (rather than fall through) avoids
 * hammering every provider when the first is unhealthy. If you want
 * fall-through-on-transient behaviour, change this in one place.
 */
export const resolveProductData = async (
  code: string,
  ctx: ProviderContext,
  providers: ProductDataProvider[] = productDataProviders
): Promise<ResolveResult> => {
  const rawByProvider: Record<string, unknown> = {};

  for (const provider of providers) {
    const outcome = await provider.fetch(code, ctx);
    if (outcome.kind === "hit") {
      return {
        kind: "hit",
        providerId: provider.id,
        data: outcome.data,
        raw: outcome.raw,
      };
    }
    if (outcome.kind === "transient") {
      return { kind: "transient", providerId: provider.id, status: outcome.status };
    }
    rawByProvider[provider.id] = outcome.raw;
  }

  return { kind: "miss", rawByProvider };
};

export type { ProductData, ProductDataProvider, ProviderContext, ProviderOutcome } from "./types";
