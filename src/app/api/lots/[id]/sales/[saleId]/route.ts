import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dollarsToCents } from "@/lib/money";
import { recomputeLotSaleProfits } from "@/lib/calculations";

export const dynamic = "force-dynamic";

type Params = { params: { id: string; saleId: string } };

export async function PATCH(req: Request, { params }: Params) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const lot = await prisma.lot.findUnique({ where: { id: params.id }, include: { sales: true } });
  if (!lot) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const existing = lot.sales.find((s) => s.id === params.saleId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};

  if ("saleDate" in body && body.saleDate) data.saleDate = new Date(body.saleDate);
  if ("notes" in body) data.notes = body.notes || null;

  if ("quantity" in body) {
    const quantity = Number.parseInt(body.quantity, 10);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Quantity must be a positive number" }, { status: 400 });
    }
    const soldByOtherSales = lot.sales.filter((s) => s.id !== params.saleId).reduce((sum, s) => sum + s.quantity, 0);
    if (quantity > lot.totalCards - soldByOtherSales) {
      return NextResponse.json(
        { error: `Only ${lot.totalCards - soldByOtherSales} card(s) available for this sale.` },
        { status: 400 }
      );
    }
    data.quantity = quantity;
  }

  if ("salePrice" in body) {
    const cents = dollarsToCents(body.salePrice);
    if (cents == null) return NextResponse.json({ error: "Sale price is required" }, { status: 400 });
    data.salePrice = cents;
  }

  await prisma.lotSale.update({ where: { id: params.saleId }, data });

  // A sale's profit depends on every other sale in the lot's chronological
  // order (cost-recovery waterfall), so any edit here — date, quantity, or
  // price — requires recomputing and persisting all of the lot's sales.
  const freshSales = await prisma.lotSale.findMany({ where: { lotId: lot.id } });
  const profitBySaleId = recomputeLotSaleProfits(lot, freshSales);
  await prisma.$transaction(
    freshSales.map((s) => prisma.lotSale.update({ where: { id: s.id }, data: { profit: profitBySaleId.get(s.id) ?? 0 } }))
  );

  const updated = await prisma.lotSale.findUniqueOrThrow({ where: { id: params.saleId } });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const existing = await prisma.lotSale.findUnique({ where: { id: params.saleId } });
  if (!existing || existing.lotId !== params.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.lotSale.delete({ where: { id: params.saleId } });

  // Removing a sale shifts how much of the lot's cost the remaining sales
  // have recovered in chronological order, so they need recomputing too.
  const lot = await prisma.lot.findUnique({ where: { id: params.id } });
  const remainingSales = await prisma.lotSale.findMany({ where: { lotId: params.id } });
  if (lot && remainingSales.length > 0) {
    const profitBySaleId = recomputeLotSaleProfits(lot, remainingSales);
    await prisma.$transaction(
      remainingSales.map((s) =>
        prisma.lotSale.update({ where: { id: s.id }, data: { profit: profitBySaleId.get(s.id) ?? 0 } })
      )
    );
  }

  return NextResponse.json({ ok: true });
}
