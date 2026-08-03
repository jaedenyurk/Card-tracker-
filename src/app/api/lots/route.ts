import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dollarsToCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function GET() {
  const lots = await prisma.lot.findMany({
    include: { sales: true },
    orderBy: { purchaseDate: "desc" },
  });
  return NextResponse.json(lots);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json({ error: "Lot name is required" }, { status: 400 });
  }
  const totalCards = Number.parseInt(body.totalCards, 10);
  if (!Number.isFinite(totalCards) || totalCards <= 0) {
    return NextResponse.json({ error: "Total cards must be a positive number" }, { status: 400 });
  }
  const totalCost = dollarsToCents(body.totalCost);
  if (totalCost == null) {
    return NextResponse.json({ error: "Total cost is required" }, { status: 400 });
  }
  if (!body.purchaseDate) {
    return NextResponse.json({ error: "Purchase date is required" }, { status: 400 });
  }

  const lot = await prisma.lot.create({
    data: {
      name: body.name.trim(),
      source: body.source || null,
      purchaseDate: new Date(body.purchaseDate),
      totalCards,
      totalCost,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(lot, { status: 201 });
}
