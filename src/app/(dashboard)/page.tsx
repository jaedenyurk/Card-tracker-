import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  computePortfolioSummaryForPeriod,
  monthlySeries,
  yearlySeries,
  type PeriodKey,
} from "@/lib/calculations";
import { toCardRow, type CardRow } from "@/lib/rows";
import { DashboardSummary } from "@/components/DashboardSummary";
import { RevenueChart } from "@/components/RevenueChart";
import { TopMovers } from "@/components/TopMovers";
import type { PortfolioSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [cards, expenses] = await Promise.all([
    prisma.card.findMany(),
    prisma.expense.findMany(),
  ]);

  const now = new Date();
  const summaries: Record<PeriodKey, PortfolioSummary> = {
    MONTH: computePortfolioSummaryForPeriod(cards, expenses, "MONTH", now),
    YTD: computePortfolioSummaryForPeriod(cards, expenses, "YTD", now),
    ALL: computePortfolioSummaryForPeriod(cards, expenses, "ALL", now),
  };
  const monthly = monthlySeries(cards, expenses);
  const yearly = yearlySeries(cards, expenses);

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
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-soft"
        >
          + Add Card
        </Link>
      </div>

      <DashboardSummary summaries={summaries} />

      <RevenueChart monthly={monthly} yearly={yearly} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TopMovers title="Top Performers" rows={topMovers} />
        <TopMovers title="Underperformers" rows={worstMovers} />
      </div>
    </div>
  );
}
