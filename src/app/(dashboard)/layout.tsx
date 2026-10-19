import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      {/* On phones the floating menu button sits in the top-left corner, so content starts below it. */}
      <main className="min-w-0 flex-1 px-4 pb-12 pt-20 sm:px-6 md:px-10 md:pb-14 md:pt-10">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>
    </div>
  );
}
