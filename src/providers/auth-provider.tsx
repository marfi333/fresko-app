"use client";

import type { ReactNode } from "react";
import { useSession } from "@/hooks/use-session";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return <>{children}</>;
}

export function useRequireAuth() {
  const session = useSession();
  return session;
}
