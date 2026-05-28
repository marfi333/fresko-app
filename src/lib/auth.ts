import type { D1Database } from "@cloudflare/workers-types";
import { betterAuth } from "better-auth";
import { withCloudflare } from "better-auth-cloudflare";
import { organization } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/schema";

export function createAuth(d1: D1Database, baseURL?: string) {
  const db = drizzle(d1, { schema });

  return betterAuth({
    baseURL,
    ...withCloudflare(
      {
        d1: {
          db,
          options: {
            usePlural: false,
          },
        },
        cf: {},
      },
      {
        emailAndPassword: {
          enabled: true,
        },
        plugins: [
          organization({
            creatorRole: "owner",
          }),
          nextCookies(),
        ],
      }
    ),
  });
}

export type Auth = ReturnType<typeof createAuth>;
