import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cardCostBasis, cardProfit, cardROI, formatCents, formatPercent } from "@/lib/calculations";
import { centsToDollars } from "@/lib/money";
import { CardActionsPanel } from "@/components/CardActionsPanel";
import { CardExpenses } from "@/components/CardExpenses";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";

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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Card detail"
        title={card.player}
        back={
          <Link href="/inventory" className="text-xs font-semibold text-muted transition-ui hover:text-fg">
            ← Back to Inventory
          </Link>
        }
        subtitle={
          <>
            {card.year ? `${card.year} · ` : ""}
            {card.setName ? `${card.setName} · ` : ""}
            {card.sport} · {gradingLabel}
          </>
        }
        action={
          <div className="flex items-center gap-3">
            <span className={"chip " + (card.status === "SOLD" ? "bg-ok/[.14] text-ok-text" : "bg-gold/[.14] text-gold-text")}>
              {card.status === "SOLD" ? "Sold" : "Held"}
            </span>
            <Link href={`/inventory/${card.id}/edit`} className="btn-ghost btn-sm">
              Edit
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Cost Basis" value={formatCents(costBasis)} />
        <KpiCard label={card.status === "SOLD" ? "Sold Price" : "Est. Value"} value={
          card.status === "SOLD"
            ? formatCents(card.soldPrice ?? 0)
            : card.marketValue != null
              ? formatCents(card.marketValue)
              : "—"
        } />
        <KpiCard
          label={card.status === "SOLD" ? "Realized Profit" : "Unrealized Profit"}
          value={profit != null ? formatCents(profit) : "—"}
          tone={profit == null ? "neutral" : profit >= 0 ? "gain" : "loss"}
        />
        <KpiCard
          label="ROI"
          value={formatPercent(roi)}
          tone={roi == null ? "neutral" : roi >= 0 ? "gain" : "loss"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="mb-4 font-display text-base font-bold tracking-tight text-fg">Details</h2>
            <dl className="divide-y divide-line text-sm">
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

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-fg">{value}</dd>
    </div>
  );
}
