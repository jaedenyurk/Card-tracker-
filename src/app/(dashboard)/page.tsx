import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  computePortfolioSummary,
  formatCents,
  formatPercent,
  monthlySeries,
  yearlySeries,
} from "@/lib/calculations";
import { toCardRow, type CardRow } from "@/lib/rows";
import { KpiCard } from "@/components/KpiCard";
import { RevenueChart } from "@/components/RevenueChart";
import { TopMovers } from "@/components/TopMovers";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [cards, expenses] = await Promise.all([
    prisma.card.findMany(),
    prisma.expense.findMany(),
  ]);

  const summary = computePortfolioSummary(cards, expenses);
  const monthly = monthlySeries(cards, expenses);
  const yearly = yearlySeries(cards, expenses);

  const rows = cards.map((c) => toCardRow(c, expenses));
  const withROI = rows.filter((r): r is CardRow & { roi: number } => r.roi != null);
  const topMovers = [...withROI].sort((a, b) => b.roi - a.roi).slice(0, 5);
  const worstMovers = [...withROI].sort((a, b) => a.roi - b.roi).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <KpiCard label="Total Revenue" value={formatCents(summary.totalRevenue)} sublabel={`${summary.soldCount} sold`} />
        <KpiCard label="Total Expenses" value={formatCents(summary.totalExpenses)} sublabel="COGS + operating" />
        <KpiCard
          label="Net P&L"
          value={formatCents(summary.netPnL)}
          tone={summary.netPnL >= 0 ? "gain" : "loss"}
          sublabel="All time"
        />
        <KpiCard
          label="Realized ROI"
          value={formatPercent(summary.realizedROI)}
          tone={summary.realizedROI != null && summary.realizedROI >= 0 ? "gain" : summary.realizedROI != null ? "loss" : "neutral"}
          sublabel="On sold cards"
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
          sublabel="Realized + unrealized"
        />
      </div>

      <RevenueChart monthly={monthly} yearly={yearly} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TopMovers title="Top Performers" rows={topMovers} />
        <TopMovers title="Underperformers" rows={worstMovers} />
      </div>
    </div>
  );
}
