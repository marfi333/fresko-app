"use client";

import { type ReactNode, useEffect, useState } from "react";
import { QueuePopover } from "@/components/offline/queue-popover";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export const PageHeader = ({ title, description, action }: PageHeaderProps) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "sticky top-0 z-30 flex items-center justify-between border-b bg-background px-6 py-4 transition-colors",
        scrolled ? "border-border" : "border-transparent"
      )}
    >
      <div className="flex items-center gap-3">
        <img src="/favicon.svg" alt="" className="size-10 shrink-0" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="-mt-1.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {action}
        <QueuePopover />
      </div>
    </div>
  );
};
