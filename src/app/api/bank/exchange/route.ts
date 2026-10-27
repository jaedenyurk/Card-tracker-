import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/plaidCrypto";
import { getPlaid, plaidConfigured, plaidErrorMessage, syncItem } from "@/lib/plaid";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // the first pull of a bank's history can take a while

// Called once after the user finishes Plaid's login window: trades the one-time
// public token for a long-lived access token, stores it encrypted, and runs the first sync.
export async function POST(req: Request) {
  if (!plaidConfigured()) return NextResponse.json({ error: "Plaid isn't set up yet" }, { status: 503 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.publicToken !== "string") {
    return NextResponse.json({ error: "Missing public token" }, { status: 400 });
  }

  try {
    const plaid = getPlaid();
    const exchange = await plaid.itemPublicTokenExchange({ public_token: body.publicToken });
    const accessToken = exchange.data.access_token;
    const institutionName =
      typeof body.institutionName === "string" && body.institutionName.trim() ? body.institutionName.trim() : "Bank";

    const encrypted = encryptToken(accessToken);
    const item = await prisma.plaidItem.upsert({
      where: { plaidItemId: exchange.data.item_id },
      create: { plaidItemId: exchange.data.item_id, institutionName, accessToken: encrypted },
      update: { institutionName, accessToken: encrypted, syncError: null },
    });

    const accounts = await plaid.accountsGet({ access_token: accessToken });
    for (const a of accounts.data.accounts) {
      const fields = { name: a.name, mask: a.mask ?? null, type: String(a.type) };
      await prisma.bankAccount.upsert({
        where: { plaidAccountId: a.account_id },
        create: { plaidAccountId: a.account_id, itemId: item.id, ...fields },
        update: fields,
      });
    }

    try {
      const result = await syncItem(item);
      return NextResponse.json({ institutionName, accounts: accounts.data.accounts.length, ...result });
    } catch (e) {
      // Connected fine; the first pull just didn't finish. "Sync now" retries it.
      return NextResponse.json({ institutionName, accounts: accounts.data.accounts.length, added: 0, syncError: (e as Error).message });
    }
  } catch (e) {
    return NextResponse.json({ error: plaidErrorMessage(e) }, { status: 502 });
  }
}
