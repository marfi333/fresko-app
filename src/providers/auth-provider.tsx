"use client";

import type { ReactNode } from "react";
import { useSession } from "@/hooks/use-session";

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  return <>{children}</>;
};

export const useRequireAuth = () => {
  const session = useSession();
  return session;
};
