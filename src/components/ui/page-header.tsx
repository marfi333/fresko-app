import type { ReactNode } from "react";
import { QueuePopover } from "@/components/offline/queue-popover";

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export const PageHeader = ({ title, description, action }: PageHeaderProps) => {
  return (
    <div className="flex items-center justify-between px-6 py-4">
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
