import { buildUpcUrl, normalizeUpcResponse } from "../upcitemdb";
import type { ProductDataProvider } from "./types";

const isAbortName = (name?: string) => name === "AbortError" || name === "TimeoutError";

export const upcitemdbProvider: ProductDataProvider = {
  id: "upcitemdb",
  fetch: async (code, { signal }) => {
    let response: Response;
    try {
      response = await fetch(buildUpcUrl(code), { signal });
    } catch (err) {
      const name = (err as { name?: string } | null)?.name;
      return { kind: "transient", status: isAbortName(name) ? 504 : 502 };
    }

    // 404 from UPCitemdb is typically wrapped in JSON with code: NO_MATCH;
    // only treat raw HTTP errors as transient.
    if (!response.ok && response.status !== 404) return { kind: "transient", status: 502 };

    const raw = (await response.json().catch(() => null)) as unknown;
    if (!raw) return { kind: "miss", raw: null };

    const normalized = normalizeUpcResponse(raw);
    if (!normalized) return { kind: "miss", raw };
    return { kind: "hit", data: normalized, raw };
  },
};
