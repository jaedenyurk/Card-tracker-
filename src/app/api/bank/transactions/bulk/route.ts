import { NextResponse } from "next/server";
import { applySuggestions, ignoreBankTransaction } from "@/lib/bankActions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const ids: unknown = body?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 500 || !ids.every((i) => typeof i === "string")) {
    return NextResponse.json({ error: "Send between 1 and 500 transaction ids" }, { status: 400 });
  }

  if (body.action === "apply-suggested") {
    return NextResponse.json(await applySuggestions(ids as string[]));
  }
  if (body.action === "ignore") {
    let ignored = 0;
    for (const id of ids as string[]) if ((await ignoreBankTransaction(id)).ok) ignored++;
    return NextResponse.json({ ignored });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
