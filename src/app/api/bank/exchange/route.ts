import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertTokenKey, encryptToken } from "@/lib/plaidCrypto";
import { getPlaid, plaidConfigured, plaidErrorMessage } from "@/lib/plaid";

export const dynamic = "force-dynamic";

// Called once after the user finishes Plaid's login window: trades the one-time
// public token for a long-lived access token and stores it encrypted. Nothing is imported
// yet: every account starts switched off until the user picks which ones to use.
export async function POST(req: Request) {
  if (!plaidConfigured()) return NextResponse.json({ error: "Plaid isn't set up yet" }, { status: 503 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.publicToken !== "string") {
    return NextResponse.json({ error: "Missing public token" }, { status: 400 });
  }

  let accessToken: string | null = null;
  try {
    // Before the one-time public token is spent: a bad key must not cost the user a bank login.
    assertTokenKey();
    const plaid = getPlaid();
    const exchange = await plaid.itemPublicTokenExchange({ public_token: body.publicToken });
    accessToken = exchange.data.access_token;
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

    return NextResponse.json({ institutionName, accounts: accounts.data.accounts.length });
  } catch (e) {
    // If the bank was linked but we couldn't save it, release it at Plaid rather than leave it dangling.
    if (accessToken) await getPlaid().itemRemove({ access_token: accessToken }).catch(() => undefined);
    return NextResponse.json({ error: plaidErrorMessage(e) }, { status: 502 });
  }
}
