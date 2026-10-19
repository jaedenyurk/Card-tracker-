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

  const date = (value: string) =>
    new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const tone = (value: number | null) => (value == null ? "text-muted" : value >= 0 ? "text-ok-text" : "text-bad-text");
  const statusChip = (status: CardRow["status"]) => (
    <span className={clsx("chip", status === "SOLD" ? "bg-ok/[.14] text-ok-text" : "bg-gold/[.14] text-gold-text")}>
      {status === "SOLD" ? "Sold" : "Held"}
    </span>
  );

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="font-display text-base font-bold tracking-tight text-fg">
          Inventory <span className="font-medium text-muted">({sorted.length})</span>
        </h2>
        <div className="seg">
          {(["ALL", "HELD", "SOLD"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={clsx("seg-tab capitalize", statusFilter === s && "seg-tab-on")}
            >
              {s === "ALL" ? "All" : s === "HELD" ? "Held" : "Sold"}
            </button>
          ))}
        </div>
      </div>

      {/* Phones: each card is its own stacked tile. */}
      <ul className="divide-y divide-line xl:hidden">
        {sorted.map((row) => (
          <li key={row.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-fg">{row.player}</p>
                <p className="text-xs text-muted">
                  {row.year ? `${row.year} · ` : ""}
                  {row.sport} · {row.gradingLabel}
                </p>
              </div>
              {statusChip(row.status)}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Cost basis</dt>
                <dd className="tabular-nums text-fg">{formatCents(row.costBasis)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Value</dt>
                <dd className="tabular-nums text-fg">{row.currentValue != null ? formatCents(row.currentValue) : "—"}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Profit</dt>
                <dd className={clsx("font-semibold tabular-nums", tone(row.profit))}>{row.profit != null ? formatCents(row.profit) : "—"}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">ROI</dt>
                <dd className={clsx("font-semibold tabular-nums", tone(row.roi))}>{formatPercent(row.roi)}</dd>
              </div>
            </dl>
            <div className="mt-3 flex items-center justify-between text-xs text-muted">
              <span>Acquired {date(row.purchaseDate)}</span>
              <Link href={`/inventory/${row.id}`} className="font-semibold text-gold-text hover:underline">
                View
              </Link>
            </div>
          </li>
        ))}
        {sorted.length === 0 && <li className="px-5 py-10 text-center text-sm text-muted">No cards match this filter yet.</li>}
      </ul>

      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="th cursor-pointer select-none transition-ui hover:text-fg"
                >
                  {col.label}
                  {sortKey === col.key && <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>}
                </th>
              ))}
              <th className="th" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.id} className="border-b border-line transition-ui last:border-0 hover:bg-gold/[.07]">
                <td className="whitespace-nowrap px-5 py-3.5">
                  <p className="font-semibold text-fg">{row.player}</p>
                  <p className="text-xs text-muted">
                    {row.year ? `${row.year} · ` : ""}
                    {row.sport} · {row.gradingLabel}
                  </p>
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-muted">{date(row.purchaseDate)}</td>
                <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-fg">{formatCents(row.costBasis)}</td>
                <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-fg">
                  {row.currentValue != null ? formatCents(row.currentValue) : "—"}
                </td>
                <td className={clsx("whitespace-nowrap px-5 py-3.5 font-semibold tabular-nums", tone(row.profit))}>
                  {row.profit != null ? formatCents(row.profit) : "—"}
                </td>
                <td className={clsx("whitespace-nowrap px-5 py-3.5 font-semibold tabular-nums", tone(row.roi))}>
                  {formatPercent(row.roi)}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5">
                  <span className="mr-3">{statusChip(row.status)}</span>
                  <Link href={`/inventory/${row.id}`} className="text-xs font-semibold text-gold-text hover:underline">
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
