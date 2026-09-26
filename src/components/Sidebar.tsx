"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "◧" },
  { href: "/inventory", label: "Inventory", icon: "▤" },
  { href: "/revenue", label: "Revenue", icon: "▲" },
  { href: "/expenses", label: "Expenses", icon: "≡" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-accent/15 bg-base-900 px-4 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foil text-base-950 font-bold">
            $
          </div>
          <p className="text-sm font-semibold text-white">Card Business Tracker</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition hover:bg-accent/10"
        >
          <span className="text-lg">☰</span>
        </button>
      </header>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 -translate-x-full flex-col border-r border-accent/15 bg-base-900 px-4 py-6 transition-transform duration-200 ease-out",
          "md:relative md:z-auto md:w-60 md:translate-x-0",
          open && "translate-x-0"
        )}
      >
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foil text-base-950 font-bold">
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
                    ? "bg-accent/15 text-accent font-medium"
                    : "text-muted hover:bg-accent/10 hover:text-white"
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
          className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-accent/10 hover:text-white"
        >
          <span className="w-4 text-center">⏻</span>
          Log out
        </button>
      </aside>
    </>
  );
}
