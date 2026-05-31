import { buildOffUrl, buildOffUserAgent, normalizeOffResponse } from "../open-food-facts";
import type { ProductDataProvider } from "./types";

const isAbortName = (name?: string) => name === "AbortError" || name === "TimeoutError";

export const openFoodFactsProvider: ProductDataProvider = {
  id: "off",
  fetch: async (code, { origin, signal }) => {
    let response: Response;
    try {
      response = await fetch(buildOffUrl(code), {
        headers: { "User-Agent": buildOffUserAgent(origin) },
        signal,
      });
    } catch (err) {
      const name = (err as { name?: string } | null)?.name;
      return { kind: "transient", status: isAbortName(name) ? 504 : 502 };
    }

    if (response.status === 404) return { kind: "miss", raw: null };
    if (!response.ok) return { kind: "transient", status: 502 };

    const raw = (await response.json().catch(() => null)) as unknown;
    const normalized = normalizeOffResponse(raw);
    if (!normalized) return { kind: "miss", raw };
    return { kind: "hit", data: normalized, raw };
  },
};
