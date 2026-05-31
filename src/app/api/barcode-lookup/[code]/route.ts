import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/api-utils";
import {
  buildOffUrl,
  buildOffUserAgent,
  normalizeOffResponse,
} from "@/lib/barcode/open-food-facts";

const BARCODE_PATTERN = /^(\d{8}|\d{12}|\d{13})$/;
const OFF_TIMEOUT_MS = 5_000;

type RouteParams = { params: Promise<{ code: string }> };

export const GET = async (request: Request, { params }: RouteParams) => {
  const ctx = await getRequestContext(request);
  if ("error" in ctx) return ctx.error;

  const { code } = await params;
  if (!BARCODE_PATTERN.test(code)) {
    return NextResponse.json({ error: "Invalid barcode" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;

  let response: Response;
  try {
    response = await fetch(buildOffUrl(code), {
      headers: { "User-Agent": buildOffUserAgent(origin) },
      signal: AbortSignal.timeout(OFF_TIMEOUT_MS),
    });
  } catch (err) {
    const name = (err as { name?: string } | null)?.name;
    if (name === "AbortError" || name === "TimeoutError") {
      return NextResponse.json({ error: "Lookup timed out" }, { status: 504 });
    }
    return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
  }

  if (response.status === 404) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!response.ok) {
    return NextResponse.json({ error: "Upstream error" }, { status: 502 });
  }

  const raw = (await response.json()) as unknown;
  const normalized = normalizeOffResponse(raw);
  if (!normalized) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(normalized);
};
