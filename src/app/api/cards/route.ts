import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dollarsToCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function GET() {
  const cards = await prisma.card.findMany({
    include: { expenses: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(cards);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.player !== "string" || body.player.trim() === "") {
    return NextResponse.json({ error: "Player name is required" }, { status: 400 });
  }
  if (typeof body.sport !== "string" || body.sport.trim() === "") {
    return NextResponse.json({ error: "Sport is required" }, { status: 400 });
  }
  const purchasePrice = dollarsToCents(body.purchasePrice);
  if (purchasePrice == null) {
    return NextResponse.json({ error: "Purchase price is required" }, { status: 400 });
  }
  if (!body.purchaseDate) {
    return NextResponse.json({ error: "Purchase date is required" }, { status: 400 });
  }

  const card = await prisma.card.create({
    data: {
      player: body.player.trim(),
      sport: body.sport.trim(),
      year: body.year || null,
      setName: body.setName || null,
      cardNumber: body.cardNumber || null,
      parallel: body.parallel || null,
      gradingCo: body.gradingCo || null,
      grade: body.grade || null,
      imageUrl: body.imageUrl || null,
      notes: body.notes || null,
      purchaseDate: new Date(body.purchaseDate),
      purchasePrice,
      purchasePlatform: body.purchasePlatform || null,
      marketValue: dollarsToCents(body.marketValue),
    },
  });

  return NextResponse.json(card, { status: 201 });
}
