"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "◧" },
  { href: "/inventory", label: "Inventory", icon: "▤" },
  { href: "/expenses", label: "Expenses", icon: "≡" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-white/5 bg-base-900 px-4 py-6">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent font-bold">
          $
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-tight">Card Business</p>
          <p className="text-xs text-muted leading-tight">Tracker</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-accent/15 text-white font-medium"
                  : "text-muted hover:bg-white/5 hover:text-white"
              )}
            >
              <span className="w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-white/5 hover:text-white"
      >
        <span className="w-4 text-center">⏻</span>
        Log out
      </button>
    </aside>
  );
}
