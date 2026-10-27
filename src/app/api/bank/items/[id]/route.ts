import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/plaidCrypto";
import { getPlaid, plaidConfigured, plaidErrorCode, plaidErrorMessage } from "@/lib/plaid";

export const dynamic = "force-dynamic";

// Disconnects a bank: revokes the access token at Plaid, then forgets the login
// and its not-yet-reviewed transactions. Expenses and revenue already added stay.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const item = await prisma.plaidItem.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (plaidConfigured()) {
    try {
      await getPlaid().itemRemove({ access_token: decryptToken(item.accessToken) });
    } catch (e) {
      if (plaidErrorCode(e) !== "ITEM_NOT_FOUND") {
        return NextResponse.json({ error: plaidErrorMessage(e) }, { status: 502 });
      }
    }
  }
  await prisma.plaidItem.delete({ where: { id: item.id } });
  return NextResponse.json({ ok: true });
}
