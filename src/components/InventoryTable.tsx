"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { formatCents, formatPercent } from "@/lib/calculations";
import type { CardRow } from "@/lib/rows";

type SortKey = "player" | "purchaseDate" | "costBasis" | "currentValue" | "profit" | "roi";

export function InventoryTable({ rows }: { rows: CardRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("purchaseDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "HELD" | "SOLD">("ALL");

  const filtered = useMemo(
    () => (statusFilter === "ALL" ? rows : rows.filter((r) => r.status === statusFilter)),
    [rows, statusFilter]
  );

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let av: number | string = a[sortKey] ?? -Infinity;
      let bv: number | string = b[sortKey] ?? -Infinity;
      if (sortKey === "player") {
        av = a.player.toLowerCase();
        bv = b.player.toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "player", label: "Card" },
    { key: "purchaseDate", label: "Acquired" },
    { key: "costBasis", label: "Cost Basis" },
    { key: "currentValue", label: "Value" },
    { key: "profit", label: "Profit" },
    { key: "roi", label: "ROI" },
  ];

  return (
    <div className="rounded-xl border border-white/5 bg-base-900 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
        <h2 className="text-sm font-semibold text-white">
          Inventory <span className="text-muted font-normal">({sorted.length})</span>
        </h2>
        <div className="flex gap-1 rounded-lg border border-white/10 bg-base-850 p-0.5 text-xs">
          {(["ALL", "HELD", "SOLD"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={clsx(
                "rounded-md px-3 py-1 capitalize transition",
                statusFilter === s ? "bg-accent text-white" : "text-muted hover:text-white"
              )}
            >
              {s === "ALL" ? "All" : s === "HELD" ? "Held" : "Sold"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wide text-muted">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="cursor-pointer select-none whitespace-nowrap px-5 py-3 hover:text-white"
                >
                  {col.label}
                  {sortKey === col.key && <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>}
                </th>
              ))}
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.id}
                className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
              >
                <td className="whitespace-nowrap px-5 py-3">
                  <p className="font-medium text-white">{row.player}</p>
                  <p className="text-xs text-muted">
                    {row.year ? `${row.year} · ` : ""}
                    {row.sport} · {row.gradingLabel}
                  </p>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-muted">
                  {new Date(row.purchaseDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </td>
                <td className="whitespace-nowrap px-5 py-3 font-mono text-white">
                  {formatCents(row.costBasis)}
                </td>
                <td className="whitespace-nowrap px-5 py-3 font-mono text-white">
                  {row.currentValue != null ? formatCents(row.currentValue) : "—"}
                </td>
                <td
                  className={clsx(
                    "whitespace-nowrap px-5 py-3 font-mono",
                    row.profit == null ? "text-muted" : row.profit >= 0 ? "text-gain" : "text-loss"
                  )}
                >
                  {row.profit != null ? formatCents(row.profit) : "—"}
                </td>
                <td
                  className={clsx(
                    "whitespace-nowrap px-5 py-3 font-mono",
                    row.roi == null ? "text-muted" : row.roi >= 0 ? "text-gain" : "text-loss"
                  )}
                >
                  {formatPercent(row.roi)}
                </td>
                <td className="whitespace-nowrap px-5 py-3">
                  <span
                    className={clsx(
                      "mr-3 rounded-full px-2 py-0.5 text-xs",
                      row.status === "SOLD" ? "bg-gain/15 text-gain" : "bg-accent/15 text-accent"
                    )}
                  >
                    {row.status === "SOLD" ? "Sold" : "Held"}
                  </span>
                  <Link href={`/inventory/${row.id}`} className="text-xs text-accent hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted">
                  No cards match this filter yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
