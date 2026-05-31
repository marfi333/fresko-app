"use client";

import type { LucideIcon } from "lucide-react";
import { BarChart3, Package, ShoppingCart, User } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Shopping", href: "/shopping", icon: ShoppingCart },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Profile", href: "/profile", icon: User },
];
