import Link from "next/link";
import clsx from "clsx";
import { formatCents, formatPercent } from "@/lib/calculations";
import type { CardRow } from "@/lib/rows";

// A ranked list of cards by ROI. The "feature" variant is the black panel (rows are translucent tiles, ROI sits in a gold badge); the default is a white panel.
export function TopMovers({ title, rows, variant = "light" }: { title: string; rows: CardRow[]; variant?: "light" | "feature" }) {
  const feature = variant === "feature";
  return (
    <section className={clsx(feature ? "feature theme-ink p-7" : "panel p-6")}>
      <h2 className="font-display text-base font-bold tracking-tight text-fg">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Not enough data yet.</p>
      ) : (
        <ul className="mt-5 space-y-2.5">
          {rows.map((row, index) => (
            <li key={row.id}>
              <Link
                href={`/inventory/${row.id}`}
                className={clsx(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-ui",
                  feature ? "bg-card/[.06] hover:bg-card/[.12]" : "hover:bg-gold/10"
                )}
              >
                <span className={clsx("rank", index === 0 && "rank-top")}>{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">{row.player}</p>
                  <p className="truncate text-xs text-muted">
                    {row.year ? `${row.year} · ` : ""}
                    {row.gradingLabel}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  {feature ? (
                    <span className="chip bg-gold-grad font-extrabold tabular-nums text-ink shadow-gold">{formatPercent(row.roi)}</span>
                  ) : (
                    <p className={clsx("text-sm font-bold tabular-nums", (row.roi ?? 0) >= 0 ? "text-ok-text" : "text-bad-text")}>
                      {formatPercent(row.roi)}
                    </p>
                  )}
                  <p className="text-xs tabular-nums text-muted">{formatCents(row.profit ?? 0)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
