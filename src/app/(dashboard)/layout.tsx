import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-base-950 md:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
