import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dollarsToCents } from "@/lib/money";
import { recomputeLotSaleProfits } from "@/lib/calculations";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const lot = await prisma.lot.findUnique({ where: { id: params.id }, include: { sales: true } });
  if (!lot) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const quantity = Number.parseInt(body.quantity, 10);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "Quantity must be a positive number" }, { status: 400 });
  }
  const alreadySold = lot.sales.reduce((sum, s) => sum + s.quantity, 0);
  if (quantity > lot.totalCards - alreadySold) {
    return NextResponse.json({ error: "Quantity exceeds cards remaining in this lot" }, { status: 400 });
  }
  const salePrice = dollarsToCents(body.salePrice);
  if (salePrice == null) {
    return NextResponse.json({ error: "Sale price is required" }, { status: 400 });
  }
  if (!body.saleDate) {
    return NextResponse.json({ error: "Sale date is required" }, { status: 400 });
  }

  const created = await prisma.lotSale.create({
    data: {
      lotId: lot.id,
      saleDate: new Date(body.saleDate),
      quantity,
      salePrice,
      profit: 0, // placeholder; recomputed below alongside every other sale in the lot
      notes: body.notes || null,
    },
  });

  // Adding a sale can shift how much of the lot's cost every other sale in
  // chronological order has recovered, so every sale's profit is recomputed
  // and persisted together, not just the new one.
  const allSales = [...lot.sales, created];
  const profitBySaleId = recomputeLotSaleProfits(lot, allSales);
  await prisma.$transaction(
    allSales.map((s) => prisma.lotSale.update({ where: { id: s.id }, data: { profit: profitBySaleId.get(s.id) ?? 0 } }))
  );

  const sale = await prisma.lotSale.findUniqueOrThrow({ where: { id: created.id } });
  return NextResponse.json(sale, { status: 201 });
}
