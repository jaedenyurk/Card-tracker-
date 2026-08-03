import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: { id: string; saleId: string } };

export async function DELETE(_req: Request, { params }: Params) {
  const existing = await prisma.lotSale.findUnique({ where: { id: params.saleId } });
  if (!existing || existing.lotId !== params.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.lotSale.delete({ where: { id: params.saleId } });
  return NextResponse.json({ ok: true });
}
