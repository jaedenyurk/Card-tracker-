"use client";

import { useState } from "react";
import clsx from "clsx";
import { formatCents, formatPercent, type PeriodKey } from "@/lib/calculations";
import { KpiCard } from "@/components/KpiCard";
import type { PortfolioSummary, CashFlowSummary } from "@/lib/types";

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

export function DashboardSummary({
  cashSummaries,
  portfolioSummaries,
}: {
  cashSummaries: Record<PeriodKey, CashFlowSummary>;
  portfolioSummaries: Record<PeriodKey, PortfolioSummary>;
}) {
  const [period, setPeriod] = useState<PeriodKey>("MONTH");
  const cash = cashSummaries[period];
  const portfolio = portfolioSummaries[period];

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
          value={formatCents(cash.totalRevenue)}
          sublabel={`${cash.revenueCount} ${cash.revenueCount === 1 ? "entry" : "entries"} · ${PERIOD_SUBLABEL[period]}`}
        />
        <KpiCard
          label="Total Expenses"
          value={formatCents(cash.totalExpenses)}
          sublabel={`${cash.expenseCount} ${cash.expenseCount === 1 ? "entry" : "entries"} · ${PERIOD_SUBLABEL[period]}`}
        />
        <KpiCard
          label="Net P&L"
          value={formatCents(cash.netPnL)}
          tone={cash.netPnL >= 0 ? "gain" : "loss"}
          sublabel={`Revenue − Expenses · ${PERIOD_SUBLABEL[period]}`}
        />
        <KpiCard
          label="Realized ROI"
          value={formatPercent(portfolio.realizedROI)}
          tone={
            portfolio.realizedROI != null && portfolio.realizedROI >= 0
              ? "gain"
              : portfolio.realizedROI != null
                ? "loss"
                : "neutral"
          }
          sublabel={`On sold cards · ${PERIOD_SUBLABEL[period]}`}
        />
        <KpiCard label="Inventory (Cost)" value={formatCents(portfolio.inventoryCostValue)} sublabel={`${portfolio.heldCount} held`} />
        <KpiCard
          label="Inventory (Est. Value)"
          value={portfolio.inventoryMarketValue != null ? formatCents(portfolio.inventoryMarketValue) : "—"}
          sublabel="Held cards"
        />
        <KpiCard
          label="Unrealized P&L"
          value={portfolio.unrealizedProfit != null ? formatCents(portfolio.unrealizedProfit) : "—"}
          tone={portfolio.unrealizedProfit == null ? "neutral" : portfolio.unrealizedProfit >= 0 ? "gain" : "loss"}
          sublabel="Held cards vs. cost"
        />
        <KpiCard
          label="Overall ROI"
          value={formatPercent(portfolio.overallROI)}
          tone={portfolio.overallROI != null && portfolio.overallROI >= 0 ? "gain" : portfolio.overallROI != null ? "loss" : "neutral"}
          sublabel="Realized + unrealized, all time"
        />
      </div>
    </div>
  );
}
