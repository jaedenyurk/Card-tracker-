import { prisma } from "@/lib/prisma";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Revenue</h1>
        <p className="text-sm text-muted">
          Every dollar taken in — this feeds Total Revenue and Net P&L on the dashboard
        </p>
      </div>

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
