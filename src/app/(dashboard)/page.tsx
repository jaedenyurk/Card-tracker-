import { Suspense } from "react";
import Link from "next/link";
import {
  computePortfolioSummaryForPeriod,
  computeCashFlowSummaryForPeriod,
  computeLotsSummary,
  monthlySeries,
  yearlySeries,
  type PeriodKey,
} from "@/lib/calculations";
import { getCards, getExpenses, getLots, getRevenue } from "@/lib/dashboardData";
import { toCardRow, type CardRow } from "@/lib/rows";
import { DashboardSummary } from "@/components/DashboardSummary";
import { PageHeader } from "@/components/PageHeader";
import { RevenueChart } from "@/components/RevenueChart";
import { ChartSkeleton, MoversSkeleton, SummarySkeleton } from "@/components/Skeletons";
import { TopMovers } from "@/components/TopMovers";
import type { PortfolioSummary, CashFlowSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

async function SummarySection() {
  const [cards, expenses, revenue, lots] = await Promise.all([getCards(), getExpenses(), getRevenue(), getLots()]);
  const lotSales = lots.flatMap((l) => l.sales);
  const lotCardsRemaining = computeLotsSummary(lots, lotSales).totalCardsRemaining;

  const now = new Date();
  const periods: PeriodKey[] = ["MONTH", "YTD", "ALL"];

  // Total Revenue / Total Expenses / Net P&L come entirely from the Revenue and Expenses pages — never from a card's soldPrice or cost basis.
  const cashSummaries = Object.fromEntries(
    periods.map((p) => [p, computeCashFlowSummaryForPeriod(revenue, expenses, p, now)])
  ) as Record<PeriodKey, CashFlowSummary>;

  // Everything else (Realized ROI, inventory value, unrealized P&L, Overall ROI) still comes from cards/cost-basis, plus each lot's remaining cost/Est. Value.
  const portfolioSummaries = Object.fromEntries(
    periods.map((p) => [p, computePortfolioSummaryForPeriod(cards, expenses, p, now, lots, lotSales)])
  ) as Record<PeriodKey, PortfolioSummary>;

  return <DashboardSummary cashSummaries={cashSummaries} portfolioSummaries={portfolioSummaries} lotCardsRemaining={lotCardsRemaining} />;
}

async function TrendSection() {
  const [expenses, revenue] = await Promise.all([getExpenses(), getRevenue()]);
  return <RevenueChart monthly={monthlySeries(revenue, expenses)} yearly={yearlySeries(revenue, expenses)} />;
}

async function MoversSection() {
  const [cards, expenses] = await Promise.all([getCards(), getExpenses()]);
  const rows = cards.map((c) => toCardRow(c, expenses));
  const withROI = rows.filter((r): r is CardRow & { roi: number } => r.roi != null);
  const topMovers = [...withROI].sort((a, b) => b.roi - a.roi).slice(0, 5);
  const worstMovers = [...withROI].sort((a, b) => a.roi - b.roi).slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <TopMovers title="Top Performers" rows={topMovers} variant="feature" />
      <TopMovers title="Underperformers" rows={worstMovers} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Portfolio overview"
        title="Dashboard"
        subtitle="Your portfolio at a glance"
        action={
          <Link href="/inventory/new" className="btn-gold">
            + Add Card
          </Link>
        }
      />

      <Suspense fallback={<SummarySkeleton />}>
        <SummarySection />
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <TrendSection />
      </Suspense>

      <Suspense fallback={<MoversSkeleton />}>
        <MoversSection />
      </Suspense>
    </div>
  );
}
