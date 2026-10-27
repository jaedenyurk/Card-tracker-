import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Turns an account on or off for the review inbox (e.g. keep a personal card out).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.tracked !== "boolean") {
    return NextResponse.json({ error: "tracked must be true or false" }, { status: 400 });
  }
  const result = await prisma.bankAccount.updateMany({ where: { id: params.id }, data: { tracked: body.tracked } });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
