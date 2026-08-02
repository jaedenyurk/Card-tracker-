import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toCardRow } from "@/lib/rows";
import { InventoryTable } from "@/components/InventoryTable";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [cards, expenses] = await Promise.all([
    prisma.card.findMany({ orderBy: { purchaseDate: "desc" } }),
    prisma.expense.findMany(),
  ]);

  const rows = cards.map((c) => toCardRow(c, expenses));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Inventory</h1>
          <p className="text-sm text-muted">Every card you've bought, held, or sold</p>
        </div>
        <Link
          href="/inventory/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-soft"
        >
          + Add Card
        </Link>
      </div>

      <InventoryTable rows={rows} />
    </div>
  );
}
