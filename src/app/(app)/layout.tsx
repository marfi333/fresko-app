import { NavBar } from "./_components/nav-bar";
import { Sidebar } from "./_components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col pb-14 md:pb-0">
        <main className="flex-1">{children}</main>
      </div>
      <NavBar />
    </div>
  );
}
