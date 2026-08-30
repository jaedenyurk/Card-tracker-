import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dollarsToCents } from "@/lib/money";
import { lotSaleProfit } from "@/lib/calculations";

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

  const profit = lotSaleProfit(lot, quantity, salePrice);

  const sale = await prisma.lotSale.create({
    data: {
      lotId: lot.id,
      saleDate: new Date(body.saleDate),
      quantity,
      salePrice,
      profit,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(sale, { status: 201 });
}
