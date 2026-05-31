import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/api-utils";
import { readCache, writeCacheHit, writeCacheMiss } from "@/lib/barcode/cache";
import { resolveProductData } from "@/lib/barcode/providers";

const BARCODE_PATTERN = /^(\d{8}|\d{12}|\d{13})$/;
const FETCH_TIMEOUT_MS = 5_000;

type RouteParams = { params: Promise<{ code: string }> };

export const GET = async (request: Request, { params }: RouteParams) => {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const { code } = await params;
  if (!BARCODE_PATTERN.test(code)) {
    return NextResponse.json({ error: "Invalid barcode" }, { status: 400 });
  }

  // Cache short-circuit
  const cached = await readCache(ctx.db, code);
  if (cached.kind === "hit" && cached.fresh) {
    return NextResponse.json({
      name: cached.name,
      brands: cached.brands,
      categoriesTags: cached.categoriesTags,
      quantity: cached.quantity,
    });
  }
  if (cached.kind === "miss" && cached.fresh) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Stale or no cache → walk the provider chain
  const origin = new URL(request.url).origin;
  const result = await resolveProductData(code, {
    origin,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (result.kind === "hit") {
    await writeCacheHit(ctx.db, {
      barcode: code,
      source: result.providerId,
      ...result.data,
      rawResponse: result.raw,
    });
    return NextResponse.json(result.data);
  }

  if (result.kind === "transient") {
    return NextResponse.json(
      { error: result.status === 504 ? "Lookup timed out" : "Lookup failed" },
      { status: result.status }
    );
  }

  // All providers missed → confirmed unknown for TTL. Persist every raw
  // payload so we know exactly what each upstream said for this code.
  await writeCacheMiss(ctx.db, code, result.rawByProvider);
  return NextResponse.json({ error: "Not found" }, { status: 404 });
};
