import { QueuePopover } from "@/components/offline/queue-popover";
import { NavBar } from "./_components/nav-bar";
import { Sidebar } from "./_components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-14 md:pb-0">
        <header className="flex h-10 items-center justify-end border-b border-border bg-background/80 px-4 backdrop-blur">
          <QueuePopover />
        </header>
        <main className="flex-1">{children}</main>
      </div>
      <NavBar />
    </div>
  );
}
