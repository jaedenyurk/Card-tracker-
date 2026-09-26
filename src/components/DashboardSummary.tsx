"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { formatCents, formatPercent, type PeriodKey } from "@/lib/calculations";
import { readStoredPeriod, writeStoredPeriod } from "@/lib/periodPreference";
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
  lotCardsRemaining,
}: {
  cashSummaries: Record<PeriodKey, CashFlowSummary>;
  portfolioSummaries: Record<PeriodKey, PortfolioSummary>;
  lotCardsRemaining: number;
}) {
  const [period, setPeriodState] = useState<PeriodKey>("MONTH");

  // Read the shared preference after mount (not during the initial render) so
  // server and client markup match on first paint; the dashboard, revenue, and
  // expenses pages all read/write this same key, so picking a period carries through.
  useEffect(() => setPeriodState(readStoredPeriod()), []);

  function setPeriod(next: PeriodKey) {
    setPeriodState(next);
    writeStoredPeriod(next);
  }

  const cash = cashSummaries[period];
  const portfolio = portfolioSummaries[period];

  return (
    <div className="space-y-4">
      <div className="flex w-fit gap-1 rounded-lg border border-accent/20 bg-base-850 p-0.5 text-xs">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={clsx(
              "rounded-md px-3 py-1 transition",
              period === p.key ? "bg-accent text-base-950" : "text-muted hover:text-white"
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
        <KpiCard
          label="Inventory (Cost)"
          value={formatCents(portfolio.inventoryCostValue)}
          sublabel={`${portfolio.heldCount} held${lotCardsRemaining > 0 ? ` + ${lotCardsRemaining} lot cards` : ""}`}
        />
        <KpiCard
          label="Inventory (Est. Value)"
          value={portfolio.inventoryMarketValue != null ? formatCents(portfolio.inventoryMarketValue) : "—"}
          sublabel={lotCardsRemaining > 0 ? "Held cards + lots" : "Held cards"}
        />
        <KpiCard
          label="Unrealized P&L"
          value={portfolio.unrealizedProfit != null ? formatCents(portfolio.unrealizedProfit) : "—"}
          tone={portfolio.unrealizedProfit == null ? "neutral" : portfolio.unrealizedProfit >= 0 ? "gain" : "loss"}
          sublabel={lotCardsRemaining > 0 ? "Held cards + lots vs. cost" : "Held cards vs. cost"}
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
