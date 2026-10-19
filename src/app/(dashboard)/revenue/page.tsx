import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { RevenueManager } from "@/components/RevenueManager";

export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  const [revenue, cards] = await Promise.all([
    prisma.revenue.findMany({
      include: { card: { select: { id: true, player: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.card.findMany({ select: { id: true, player: true }, orderBy: { player: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Cash in"
        title="Revenue"
        subtitle="Every dollar taken in — this feeds Total Revenue and Net P&L on the dashboard"
      />

      <RevenueManager
        revenue={revenue.map((r) => ({
          id: r.id,
          date: r.date.toISOString(),
          category: r.category,
          description: r.description,
          amount: r.amount,
          card: r.card,
        }))}
        cardOptions={cards}
      />
    </div>
  );
}
