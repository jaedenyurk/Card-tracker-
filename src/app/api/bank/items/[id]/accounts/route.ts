import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { diffAccountSelection } from "@/lib/bankFeed";

export const dynamic = "force-dynamic";

// Saves which of a connected login's accounts this app should use. Only selected
// accounts are ever synced or stored.
//  - Accounts switched off lose their unreviewed transactions right away (anything
//    already added as an expense or revenue stays).
//  - Accounts switched on get their history pulled by resetting the sync cursor, so
//    the next sync starts from the beginning for them.
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const ids: unknown = body?.accountIds;
  if (!Array.isArray(ids) || !ids.every((i) => typeof i === "string")) {
    return NextResponse.json({ error: "accountIds must be a list of account ids" }, { status: 400 });
  }

  const item = await prisma.plaidItem.findUnique({
    where: { id: params.id },
    select: { id: true, accounts: { select: { id: true, tracked: true } } },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { on, off, selected } = diffAccountSelection(item.accounts, ids as string[]);
  await prisma.$transaction([
    prisma.bankAccount.updateMany({ where: { itemId: item.id, id: { in: selected } }, data: { tracked: true } }),
    prisma.bankAccount.updateMany({ where: { itemId: item.id, id: { notIn: selected } }, data: { tracked: false } }),
    prisma.bankTransaction.deleteMany({ where: { accountId: { in: off }, status: { in: ["NEW", "IGNORED"] } } }),
    ...(on.length > 0 ? [prisma.plaidItem.update({ where: { id: item.id }, data: { cursor: null, syncError: null } })] : []),
  ]);

  return NextResponse.json({ enabled: on.length, disabled: off.length, selected: selected.length });
}
