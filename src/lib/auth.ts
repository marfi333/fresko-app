import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { getDb } from "@/db";

export const createAuth = (baseURL?: string) => {
  return betterAuth({
    baseURL,
    trustedOrigins:
      process.env.NODE_ENV === "development"
        ? [
            "http://10.*.*.*:*",
            "http://192.168.*.*:*",
            "http://172.*.*.*:*",
            "https://10.*.*.*:*",
            "https://192.168.*.*:*",
            "https://172.*.*.*:*",
          ]
        : ["https://fresko.erkely.tech"],
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
};

export type Auth = ReturnType<typeof createAuth>;
