import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dollarsToCents } from "@/lib/money";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const card = await prisma.card.findUnique({
    where: { id: params.id },
    include: { expenses: { orderBy: { date: "desc" } } },
  });
  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(card);
}

export async function PATCH(req: Request, { params }: Params) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await prisma.card.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};

  // Descriptive fields
  for (const field of [
    "player",
    "sport",
    "year",
    "setName",
    "cardNumber",
    "parallel",
    "gradingCo",
    "grade",
    "imageUrl",
    "notes",
    "purchasePlatform",
    "soldPlatform",
  ] as const) {
    if (field in body) data[field] = body[field] || null;
  }

  if ("purchaseDate" in body && body.purchaseDate) {
    data.purchaseDate = new Date(body.purchaseDate);
  }
  if ("purchasePrice" in body) {
    const cents = dollarsToCents(body.purchasePrice);
    if (cents != null) data.purchasePrice = cents;
  }
  if ("marketValue" in body) {
    data.marketValue = dollarsToCents(body.marketValue);
  }

  // Selling a card
  if (body.status === "SOLD") {
    if (!body.soldDate || dollarsToCents(body.soldPrice) == null) {
      return NextResponse.json(
        { error: "Sold date and sold price are required to mark a card sold" },
        { status: 400 }
      );
    }
    data.status = "SOLD";
    data.soldDate = new Date(body.soldDate);
    data.soldPrice = dollarsToCents(body.soldPrice);
  } else if (body.status === "HELD") {
    // Reverting a sale
    data.status = "HELD";
    data.soldDate = null;
    data.soldPrice = null;
  }

  const updated = await prisma.card.update({ where: { id: params.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const existing = await prisma.card.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.card.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
