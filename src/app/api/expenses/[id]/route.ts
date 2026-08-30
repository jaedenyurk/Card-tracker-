import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dollarsToCents } from "@/lib/money";

export const dynamic = "force-dynamic";

const CATEGORIES = ["Grading", "Shipping", "Supplies", "Inventory", "Fees", "Travel", "Software", "Other"];

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await prisma.expense.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};

  if ("date" in body && body.date) data.date = new Date(body.date);
  if ("category" in body) data.category = CATEGORIES.includes(body.category) ? body.category : "Other";
  if ("description" in body && typeof body.description === "string" && body.description.trim() !== "") {
    data.description = body.description.trim();
  }
  if ("amount" in body) {
    const cents = dollarsToCents(body.amount);
    if (cents == null) return NextResponse.json({ error: "Amount is required" }, { status: 400 });
    data.amount = cents;
  }
  if ("cardId" in body) data.cardId = body.cardId || null;

  const updated = await prisma.expense.update({ where: { id: params.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const existing = await prisma.expense.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.expense.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
