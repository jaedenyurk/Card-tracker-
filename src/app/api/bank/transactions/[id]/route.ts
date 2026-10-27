import { NextResponse } from "next/server";
import {
  addBankTransaction,
  ignoreBankTransaction,
  linkBankTransaction,
  rememberRule,
  restoreBankTransaction,
  type ActionResult,
} from "@/lib/bankActions";

export const dynamic = "force-dynamic";

// One review action on one transaction: add it as an expense/revenue, ignore it,
// link it to an entry that was already typed in, or put an ignored one back.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== "string") {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }
  const category = typeof body.category === "string" ? body.category : "Other";
  let result: ActionResult;

  switch (body.action) {
    case "add":
      result = await addBankTransaction(params.id, {
        category,
        description: typeof body.description === "string" ? body.description : undefined,
      });
      if (result.ok && body.remember === true) await rememberRule(params.id, "ADD", category);
      break;
    case "ignore":
      result = await ignoreBankTransaction(params.id);
      if (result.ok && body.remember === true) await rememberRule(params.id, "IGNORE", null);
      break;
    case "link":
      if (typeof body.entryId !== "string") return NextResponse.json({ error: "Missing entryId" }, { status: 400 });
      result = await linkBankTransaction(params.id, body.entryId);
      break;
    case "restore":
      result = await restoreBankTransaction(params.id);
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: result.status });
}
