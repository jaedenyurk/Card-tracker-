import { prisma } from "@/lib/prisma";
import { ExpenseManager } from "@/components/ExpenseManager";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const [expenses, cards] = await Promise.all([
    prisma.expense.findMany({
      include: { card: { select: { id: true, player: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.card.findMany({ select: { id: true, player: true }, orderBy: { player: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Expenses</h1>
        <p className="text-sm text-muted">Grading fees, shipping, supplies, and other business costs</p>
      </div>

      <ExpenseManager
        expenses={expenses.map((e) => ({
          id: e.id,
          date: e.date.toISOString(),
          category: e.category,
          description: e.description,
          amount: e.amount,
          card: e.card,
        }))}
        cardOptions={cards}
      />
    </div>
  );
}
