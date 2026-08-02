import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cardCostBasis, cardProfit, cardROI, formatCents, formatPercent } from "@/lib/calculations";
import { centsToDollars } from "@/lib/money";
import { CardActionsPanel } from "@/components/CardActionsPanel";
import { CardExpenses } from "@/components/CardExpenses";

export const dynamic = "force-dynamic";

export default async function CardDetailPage({ params }: { params: { id: string } }) {
  const card = await prisma.card.findUnique({
    where: { id: params.id },
    include: { expenses: { orderBy: { date: "desc" } } },
  });

  if (!card) notFound();

  const costBasis = cardCostBasis(card, card.expenses);
  const profit = cardProfit(card, card.expenses);
  const roi = cardROI(card, card.expenses);
  const gradingLabel = card.gradingCo ? `${card.gradingCo}${card.grade ? ` ${card.grade}` : ""}` : "Raw / Ungraded";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/inventory" className="text-xs text-muted hover:text-white">
            ← Back to Inventory
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-white">{card.player}</h1>
          <p className="text-sm text-muted">
            {card.year ? `${card.year} · ` : ""}
            {card.setName ? `${card.setName} · ` : ""}
            {card.sport} · {gradingLabel}
          </p>
        </div>
        <span
          className={
            "rounded-full px-3 py-1 text-xs font-medium " +
            (card.status === "SOLD" ? "bg-gain/15 text-gain" : "bg-accent/15 text-accent")
          }
        >
          {card.status === "SOLD" ? "Sold" : "Held"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Cost Basis" value={formatCents(costBasis)} />
        <Stat label={card.status === "SOLD" ? "Sold Price" : "Est. Value"} value={
          card.status === "SOLD"
            ? formatCents(card.soldPrice ?? 0)
            : card.marketValue != null
              ? formatCents(card.marketValue)
              : "—"
        } />
        <Stat
          label={card.status === "SOLD" ? "Realized Profit" : "Unrealized Profit"}
          value={profit != null ? formatCents(profit) : "—"}
          tone={profit == null ? "neutral" : profit >= 0 ? "gain" : "loss"}
        />
        <Stat
          label="ROI"
          value={formatPercent(roi)}
          tone={roi == null ? "neutral" : roi >= 0 ? "gain" : "loss"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-white/5 bg-base-900 p-5 shadow-panel">
            <h2 className="mb-4 text-sm font-semibold text-white">Details</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Card #" value={card.cardNumber} />
              <Row label="Parallel" value={card.parallel} />
              <Row
                label="Purchased"
                value={`${new Date(card.purchaseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}${
                  card.purchasePlatform ? ` via ${card.purchasePlatform}` : ""
                }`}
              />
              <Row label="Purchase Price" value={formatCents(card.purchasePrice)} />
              {card.status === "SOLD" && card.soldDate && (
                <Row
                  label="Sold"
                  value={`${new Date(card.soldDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}${
                    card.soldPlatform ? ` via ${card.soldPlatform}` : ""
                  }`}
                />
              )}
              {card.notes && <Row label="Notes" value={card.notes} />}
            </dl>
          </div>

          <CardActionsPanel
            cardId={card.id}
            status={card.status}
            marketValueDollars={centsToDollars(card.marketValue)}
          />
        </div>

        <CardExpenses
          cardId={card.id}
          expenses={card.expenses.map((e) => ({
            id: e.id,
            date: e.date.toISOString(),
            category: e.category,
            description: e.description,
            amount: e.amount,
          }))}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "gain" | "loss" }) {
  return (
    <div className="rounded-xl border border-white/5 bg-base-900 p-4 shadow-panel">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p
        className={
          "mt-1 font-mono text-lg font-semibold " +
          (tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : "text-white")
        }
      >
        {value}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-white">{value}</dd>
    </div>
  );
}
