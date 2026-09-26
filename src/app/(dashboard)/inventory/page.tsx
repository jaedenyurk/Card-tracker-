import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toCardRow } from "@/lib/rows";
import { toLotRow } from "@/lib/lots";
import { computeLotsSummary } from "@/lib/calculations";
import { InventoryTable } from "@/components/InventoryTable";
import { LotManager } from "@/components/LotManager";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [cards, expenses, lots] = await Promise.all([
    prisma.card.findMany({ orderBy: { purchaseDate: "desc" } }),
    prisma.expense.findMany(),
    prisma.lot.findMany({ include: { sales: true }, orderBy: { purchaseDate: "desc" } }),
  ]);

  const rows = cards.map((c) => toCardRow(c, expenses));

  const allSales = lots.flatMap((l) => l.sales);
  const lotRows = lots.map((l) => toLotRow(l, l.sales));
  const lotsSummary = computeLotsSummary(lots, allSales);

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">Inventory</h1>
            <p className="text-sm text-muted">Every card you've bought, held, or sold</p>
          </div>
          <Link
            href="/inventory/new"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-base-950 transition hover:bg-accent-soft"
          >
            + Add Card
          </Link>
        </div>

        <InventoryTable rows={rows} />
      </div>

      <div className="border-t border-accent/10 pt-8">
        <LotManager lots={lotRows} summary={lotsSummary} />
      </div>
    </div>
  );
}
