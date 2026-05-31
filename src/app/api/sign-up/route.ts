import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { organization, user } from "@/db/schema/auth-schema";
import { seedDefaultCategories } from "@/db/seed";
import { createAuth } from "@/lib/auth";

type SignUpBody = {
  name?: string;
  email?: string;
  password?: string;
  householdName?: string;
};

export const POST = async (request: Request) => {
  const baseURL = new URL(request.url).origin;
  const auth = createAuth(baseURL);
  const db = getDb();

  const body = (await request.json()) as SignUpBody;
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const requestedHouseholdName = body.householdName?.trim();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const householdName = requestedHouseholdName || `${name}'s Household`;
  const slug = generateUniqueSlug(householdName);

  const existingUser = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (existingUser.length > 0) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const signUpResponse = await auth.api.signUpEmail({
    body: { name, email, password },
    headers: request.headers,
    asResponse: true,
  });

  if (!signUpResponse.ok) {
    const errBody = (await signUpResponse.json().catch(() => ({}))) as {
      message?: string;
    };
    return NextResponse.json(
      { error: errBody.message ?? "Sign up failed" },
      { status: signUpResponse.status }
    );
  }

  const signUpData = (await signUpResponse.json()) as {
    user: { id: string };
  };
  const userId = signUpData.user.id;
  const setCookie = signUpResponse.headers.get("set-cookie");

  const forwardedHeaders = new Headers(request.headers);
  if (setCookie) {
    forwardedHeaders.set("cookie", rewriteCookieHeader(setCookie));
  }

  try {
    const createdOrg = await auth.api.createOrganization({
      body: {
        name: householdName,
        slug,
        userId,
        keepCurrentActiveOrganization: false,
      },
      headers: forwardedHeaders,
    });

    if (!createdOrg) {
      throw new Error("Failed to create household");
    }

    await seedDefaultCategories(db, createdOrg.id);

    await auth.api.setActiveOrganization({
      body: { organizationId: createdOrg.id },
      headers: forwardedHeaders,
    });

    const response = NextResponse.json(
      { success: true, householdId: createdOrg.id },
      { status: 201 }
    );
    if (setCookie) response.headers.set("set-cookie", setCookie);
    return response;
  } catch (err) {
    await db
      .delete(user)
      .where(eq(user.id, userId))
      .catch(() => {});
    await db
      .delete(organization)
      .where(eq(organization.slug, slug))
      .catch(() => {});

    const message = err instanceof Error ? err.message : "Sign up failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

const generateUniqueSlug = (name: string): string => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const suffix = Array.from({ length: 6 }, () =>
    "abcdefghijklmnopqrstuvwxyz0123456789".charAt(Math.floor(Math.random() * 36))
  ).join("");
  return `${base || "household"}-${suffix}`;
};

const rewriteCookieHeader = (setCookie: string): string => {
  return setCookie
    .split(/,(?=[^;]+=)/)
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
};
