import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  computePortfolioSummaryForPeriod,
  computeCashFlowSummaryForPeriod,
  computeLotsSummary,
  monthlySeries,
  yearlySeries,
  type PeriodKey,
} from "@/lib/calculations";
import { toCardRow, type CardRow } from "@/lib/rows";
import { DashboardSummary } from "@/components/DashboardSummary";
import { RevenueChart } from "@/components/RevenueChart";
import { TopMovers } from "@/components/TopMovers";
import type { PortfolioSummary, CashFlowSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [cards, expenses, revenue, lots] = await Promise.all([
    prisma.card.findMany(),
    prisma.expense.findMany(),
    prisma.revenue.findMany(),
    prisma.lot.findMany({ include: { sales: true } }),
  ]);

  const lotSales = lots.flatMap((l) => l.sales);
  const lotCardsRemaining = computeLotsSummary(lots, lotSales).totalCardsRemaining;

  const now = new Date();
  const periods: PeriodKey[] = ["MONTH", "YTD", "ALL"];

  // Total Revenue / Total Expenses / Net P&L come entirely from the Revenue
  // and Expenses pages — never from a card's soldPrice or cost basis.
  const cashSummaries = Object.fromEntries(
    periods.map((p) => [p, computeCashFlowSummaryForPeriod(revenue, expenses, p, now)])
  ) as Record<PeriodKey, CashFlowSummary>;

  // Everything else (Realized ROI, inventory value, unrealized P&L, Overall ROI)
  // still comes from cards/cost-basis, plus each lot's remaining cost/Est. Value.
  const portfolioSummaries = Object.fromEntries(
    periods.map((p) => [p, computePortfolioSummaryForPeriod(cards, expenses, p, now, lots, lotSales)])
  ) as Record<PeriodKey, PortfolioSummary>;

  const monthly = monthlySeries(revenue, expenses);
  const yearly = yearlySeries(revenue, expenses);

  const rows = cards.map((c) => toCardRow(c, expenses));
  const withROI = rows.filter((r): r is CardRow & { roi: number } => r.roi != null);
  const topMovers = [...withROI].sort((a, b) => b.roi - a.roi).slice(0, 5);
  const worstMovers = [...withROI].sort((a, b) => a.roi - b.roi).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-muted">Your portfolio at a glance</p>
        </div>
        <Link
          href="/inventory/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-base-950 transition hover:bg-accent-soft"
        >
          + Add Card
        </Link>
      </div>

      <DashboardSummary
        cashSummaries={cashSummaries}
        portfolioSummaries={portfolioSummaries}
        lotCardsRemaining={lotCardsRemaining}
      />

      <RevenueChart monthly={monthly} yearly={yearly} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TopMovers title="Top Performers" rows={topMovers} />
        <TopMovers title="Underperformers" rows={worstMovers} />
      </div>
    </div>
  );
}
