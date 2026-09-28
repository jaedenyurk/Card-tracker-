import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dollarsToCents } from "@/lib/money";
import { recomputeLotSaleProfits } from "@/lib/calculations";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await prisma.lot.findUnique({ where: { id: params.id }, include: { sales: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};

  if ("name" in body && typeof body.name === "string" && body.name.trim() !== "") {
    data.name = body.name.trim();
  }
  if ("source" in body) data.source = body.source || null;
  if ("purchaseDate" in body && body.purchaseDate) data.purchaseDate = new Date(body.purchaseDate);
  if ("notes" in body) data.notes = body.notes || null;

  if ("totalCards" in body) {
    const totalCards = Number.parseInt(body.totalCards, 10);
    if (!Number.isFinite(totalCards) || totalCards <= 0) {
      return NextResponse.json({ error: "Total cards must be a positive number" }, { status: 400 });
    }
    const alreadySold = existing.sales.reduce((sum, s) => sum + s.quantity, 0);
    if (totalCards < alreadySold) {
      return NextResponse.json(
        { error: `Total cards can't be less than the ${alreadySold} already sold` },
        { status: 400 }
      );
    }
    data.totalCards = totalCards;
  }

  if ("totalCost" in body) {
    const totalCost = dollarsToCents(body.totalCost);
    if (totalCost == null) return NextResponse.json({ error: "Total cost is required" }, { status: 400 });
    data.totalCost = totalCost;
  }

  if ("estValue" in body) {
    data.estValue = dollarsToCents(body.estValue);
  }

  const updated = await prisma.lot.update({ where: { id: params.id }, data });

  // Changing totalCost shifts the cost-recovery threshold every sale is
  // measured against, so all of the lot's sales need their profit redone.
  if ("totalCost" in data && existing.sales.length > 0) {
    const profitBySaleId = recomputeLotSaleProfits(updated, existing.sales);
    await prisma.$transaction(
      existing.sales.map((s) =>
        prisma.lotSale.update({ where: { id: s.id }, data: { profit: profitBySaleId.get(s.id) ?? 0 } })
      )
    );
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const existing = await prisma.lot.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.lot.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
