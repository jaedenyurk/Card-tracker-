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

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Phones: a floating black menu button; the sidebar slides in as a drawer. */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className={clsx(
          "fixed left-3.5 top-3.5 z-40 grid h-11 w-11 place-items-center rounded-full bg-ink text-ink-on shadow-lift transition-ui hover:-translate-y-px md:hidden",
          open && "pointer-events-none opacity-0"
        )}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M2 5h14M2 9h14M2 13h14" />
        </svg>
      </button>

      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-ink/50 md:hidden" aria-hidden="true" />}

      <aside
        className={clsx(
          "theme-ink sidebar-surface fixed bottom-3.5 left-3.5 top-3.5 z-50 flex w-[17.5rem] -translate-x-[120%] flex-col rounded-[28px] px-4 py-6 transition-transform duration-200 ease-out",
          "md:sticky md:bottom-auto md:left-auto md:top-3.5 md:z-auto md:m-3.5 md:h-[calc(100vh-1.75rem)] md:w-60 md:shrink-0 md:translate-x-0 md:self-start",
          open && "translate-x-0"
        )}
      >
        <div className="mb-8 flex items-center gap-3 px-1">
          <img src="/logo.png" alt="MVP Card Collectors" width={56} height={56} className="h-14 w-14 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="font-display text-[15px] font-extrabold leading-tight tracking-tight text-fg">Card Business</p>
            <p className="text-xs leading-tight text-muted">Tracker</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition-ui hover:text-fg md:hidden"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={clsx("nav-item", active && "nav-item-on")}>
                <span className="w-4 text-center">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-line/10 pt-3">
          <button onClick={handleLogout} className="nav-item w-full text-left">
            <span className="w-4 text-center">⏻</span>
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
