import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { getDb } from "@/db";

export function createAuth(baseURL?: string) {
  return betterAuth({
    baseURL,
    database: drizzleAdapter(getDb(), {
      provider: "sqlite",
      usePlural: false,
    }),
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      organization({
        creatorRole: "owner",
      }),
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
