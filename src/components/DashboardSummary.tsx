"use client";

import { useState } from "react";
import clsx from "clsx";
import { formatCents, formatPercent, type PeriodKey } from "@/lib/calculations";
import { KpiCard } from "@/components/KpiCard";
import type { PortfolioSummary } from "@/lib/types";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "MONTH", label: "This Month" },
  { key: "YTD", label: "YTD" },
  { key: "ALL", label: "All-Time" },
];

const PERIOD_SUBLABEL: Record<PeriodKey, string> = {
  MONTH: "This month",
  YTD: "Year to date",
  ALL: "All time",
};

export function DashboardSummary({ summaries }: { summaries: Record<PeriodKey, PortfolioSummary> }) {
  const [period, setPeriod] = useState<PeriodKey>("MONTH");
  const summary = summaries[period];

  return (
    <div className="space-y-4">
      <div className="flex w-fit gap-1 rounded-lg border border-white/10 bg-base-850 p-0.5 text-xs">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={clsx(
              "rounded-md px-3 py-1 transition",
              period === p.key ? "bg-accent text-white" : "text-muted hover:text-white"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <KpiCard
          label="Total Revenue"
          value={formatCents(summary.totalRevenue)}
          sublabel={`${summary.soldCount} sold · ${PERIOD_SUBLABEL[period]}`}
        />
        <KpiCard
          label="Total Expenses"
          value={formatCents(summary.totalExpenses)}
          sublabel={`COGS + operating · ${PERIOD_SUBLABEL[period]}`}
        />
        <KpiCard
          label="Net P&L"
          value={formatCents(summary.netPnL)}
          tone={summary.netPnL >= 0 ? "gain" : "loss"}
          sublabel={PERIOD_SUBLABEL[period]}
        />
        <KpiCard
          label="Realized ROI"
          value={formatPercent(summary.realizedROI)}
          tone={summary.realizedROI != null && summary.realizedROI >= 0 ? "gain" : summary.realizedROI != null ? "loss" : "neutral"}
          sublabel={`On sold cards · ${PERIOD_SUBLABEL[period]}`}
        />
        <KpiCard label="Inventory (Cost)" value={formatCents(summary.inventoryCostValue)} sublabel={`${summary.heldCount} held`} />
        <KpiCard
          label="Inventory (Est. Value)"
          value={summary.inventoryMarketValue != null ? formatCents(summary.inventoryMarketValue) : "—"}
          sublabel="Held cards"
        />
        <KpiCard
          label="Unrealized P&L"
          value={summary.unrealizedProfit != null ? formatCents(summary.unrealizedProfit) : "—"}
          tone={summary.unrealizedProfit == null ? "neutral" : summary.unrealizedProfit >= 0 ? "gain" : "loss"}
          sublabel="Held cards vs. cost"
        />
        <KpiCard
          label="Overall ROI"
          value={formatPercent(summary.overallROI)}
          tone={summary.overallROI != null && summary.overallROI >= 0 ? "gain" : summary.overallROI != null ? "loss" : "neutral"}
          sublabel="Realized + unrealized, all time"
        />
      </div>
    </div>
  );
}
