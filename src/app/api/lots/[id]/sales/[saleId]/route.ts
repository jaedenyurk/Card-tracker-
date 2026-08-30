import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dollarsToCents } from "@/lib/money";
import { lotCostPerCard, lotSaleProfit } from "@/lib/calculations";

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

  let quantity = existing.quantity;
  if ("quantity" in body) {
    quantity = Number.parseInt(body.quantity, 10);
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

  // Profit is always re-derived from sale price and this sale's share of the
  // lot's cost — never taken directly from user input. Legacy sales logged
  // before salePrice existed fall back to their originally-stored profit to
  // reconstruct an implied sale price, so editing one for the first time
  // doesn't change its numbers unless you actually change something.
  if ("salePrice" in body || "quantity" in body) {
    const impliedExistingSalePrice = existing.salePrice ?? existing.profit + Math.round(existing.quantity * lotCostPerCard(lot));
    let salePrice = impliedExistingSalePrice;
    if ("salePrice" in body) {
      const cents = dollarsToCents(body.salePrice);
      if (cents == null) return NextResponse.json({ error: "Sale price is required" }, { status: 400 });
      salePrice = cents;
    }
    data.salePrice = salePrice;
    data.profit = lotSaleProfit(lot, quantity, salePrice);
  }

  const updated = await prisma.lotSale.update({ where: { id: params.saleId }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const existing = await prisma.lotSale.findUnique({ where: { id: params.saleId } });
  if (!existing || existing.lotId !== params.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.lotSale.delete({ where: { id: params.saleId } });
  return NextResponse.json({ ok: true });
}
