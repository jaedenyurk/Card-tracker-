import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dollarsToCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function GET() {
  const expenses = await prisma.expense.findMany({
    include: { card: { select: { id: true, player: true, sport: true } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(expenses);
}

const CATEGORIES = ["Grading", "Shipping", "Supplies", "Inventory", "Fees", "Travel", "Software", "Other"];

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.description !== "string" || body.description.trim() === "") {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }
  const amount = dollarsToCents(body.amount);
  if (amount == null) {
    return NextResponse.json({ error: "Amount is required" }, { status: 400 });
  }
  if (!body.date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }
  const category = CATEGORIES.includes(body.category) ? body.category : "Other";

  const expense = await prisma.expense.create({
    data: {
      date: new Date(body.date),
      category,
      description: body.description.trim(),
      amount,
      cardId: body.cardId || null,
    },
  });

  return NextResponse.json(expense, { status: 201 });
}
