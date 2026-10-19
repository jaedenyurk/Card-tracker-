import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toCardRow } from "@/lib/rows";
import { toLotRow } from "@/lib/lots";
import { computeLotsSummary } from "@/lib/calculations";
import { InventoryTable } from "@/components/InventoryTable";
import { LotManager } from "@/components/LotManager";
import { PageHeader } from "@/components/PageHeader";

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
    <div className="space-y-12">
      <div className="space-y-8">
        <PageHeader
          eyebrow="Inventory"
          title="Inventory"
          subtitle="Every card you've bought, held, or sold"
          action={
            <Link href="/inventory/new" className="btn-gold">
              + Add Card
            </Link>
          }
        />

        <InventoryTable rows={rows} />
      </div>

      <div>
        <LotManager lots={lotRows} summary={lotsSummary} />
      </div>
    </div>
  );
}
