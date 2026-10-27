import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";
import { getPlaid, plaidConfigured, plaidErrorMessage } from "@/lib/plaid";

export const dynamic = "force-dynamic";

// A short-lived token that lets the browser open Plaid's own bank-login window.
// Your bank credentials only ever go to Plaid, never to this app.
export async function POST() {
  if (!plaidConfigured()) return NextResponse.json({ error: "Plaid isn't set up yet" }, { status: 503 });
  try {
    const res = await getPlaid().linkTokenCreate({
      user: { client_user_id: "card-tracker-owner" },
      client_name: "Card Tracker",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
      transactions: { days_requested: 90 },
      // Needed for banks that sign you in on their own site (Chase, Bank of America, ...).
      // Must also be listed under Allowed redirect URIs in the Plaid dashboard.
      ...(process.env.PLAID_REDIRECT_URI ? { redirect_uri: process.env.PLAID_REDIRECT_URI } : {}),
    });
    return NextResponse.json({ linkToken: res.data.link_token });
  } catch (e) {
    return NextResponse.json({ error: plaidErrorMessage(e) }, { status: 502 });
  }
}
