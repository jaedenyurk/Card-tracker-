import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function DELETE(_req: Request, { params }: Params) {
  const existing = await prisma.revenue.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.revenue.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
