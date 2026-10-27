import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { plaidConfigured, syncItem } from "@/lib/plaid";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Pulls new transactions for every connected bank / card (or just one, with { itemId }).
export async function POST(req: Request) {
  if (!plaidConfigured()) return NextResponse.json({ error: "Plaid isn't set up yet" }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const items = await prisma.plaidItem.findMany({
    where: typeof body?.itemId === "string" ? { id: body.itemId } : undefined,
  });

  const results: { institutionName: string; added?: number; error?: string }[] = [];
  for (const item of items) {
    try {
      const r = await syncItem(item);
      results.push({ institutionName: item.institutionName, added: r.added });
    } catch (e) {
      results.push({ institutionName: item.institutionName, error: (e as Error).message });
    }
  }
  return NextResponse.json({
    added: results.reduce((sum, r) => sum + (r.added ?? 0), 0),
    results,
  });
}
