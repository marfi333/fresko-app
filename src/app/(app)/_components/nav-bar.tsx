"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

const BRAND_INDEX = 2;

export const NavBar = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-3 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
      <div className="flex items-center justify-around">
        {navItems.slice(0, BRAND_INDEX).map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
        <div
          aria-hidden
          className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-2 py-3 text-xs text-muted-foreground"
        >
          <img src="/favicon.svg" alt="" className="size-6" />
          <span className="font-medium">Fresko</span>
        </div>
        {navItems.slice(BRAND_INDEX).map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
};

const NavLink = ({ item, pathname }: { item: (typeof navItems)[number]; pathname: string }) => {
  const isActive = pathname.startsWith(item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-2 py-3 text-xs transition-colors",
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="size-5" />
      <span>{item.label}</span>
    </Link>
  );
};
