import Link from "next/link";
import { formatCents, formatPercent } from "@/lib/calculations";
import type { CardRow } from "@/lib/rows";

export function TopMovers({ title, rows }: { title: string; rows: CardRow[] }) {
  return (
    <div className="rounded-xl border border-accent/10 bg-base-900 p-5 shadow-panel">
      <h2 className="mb-4 text-sm font-semibold text-white">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Not enough data yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/inventory/${row.id}`}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 -mx-2 transition hover:bg-accent/10"
              >
                <div>
                  <p className="text-sm text-white">{row.player}</p>
                  <p className="text-xs text-muted">
                    {row.year ? `${row.year} · ` : ""}
                    {row.gradingLabel}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-mono text-sm ${(row.roi ?? 0) >= 0 ? "text-gain" : "text-loss"}`}>
                    {formatPercent(row.roi)}
                  </p>
                  <p className="text-xs text-muted">{formatCents(row.profit ?? 0)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
