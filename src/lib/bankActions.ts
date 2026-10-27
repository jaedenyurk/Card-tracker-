import { prisma } from "./prisma";
import {
  EXPENSE_CATEGORIES,
  REVENUE_CATEGORIES,
  directionOf,
  normalizeMerchantKey,
  isBulkSafe,
  suggestFor,
} from "./bankFeed";

// What happens when a bank transaction is reviewed. Adding one creates an
// ordinary Expense or Revenue row, so the Expenses / Revenue pages and the
// dashboard treat it like anything typed in by hand.

export type ActionResult = { ok: true } | { ok: false; status: number; error: string };

const fail = (status: number, error: string): ActionResult => ({ ok: false, status, error });

const isLinked = (tx: { expenseId: string | null; revenueId: string | null }) => tx.expenseId != null || tx.revenueId != null;

export async function addBankTransaction(
  id: string,
  opts: { category: string; description?: string }
): Promise<ActionResult> {
  return prisma.$transaction(async (db) => {
    const tx = await db.bankTransaction.findUnique({ where: { id } });
    if (!tx) return fail(404, "Transaction not found");
    // An ADDED row whose expense/revenue was since deleted has lost its link, so it can be added again.
    if (tx.status === "ADDED" && isLinked(tx)) return fail(409, "Already added");
    if (tx.amount === 0) return fail(400, "A $0 transaction can't be added");

    const money = directionOf(tx.amount) === "IN";
    const allowed = money ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES;
    const category = allowed.includes(opts.category) ? opts.category : "Other";
    const description = (opts.description?.trim() || tx.merchantName || tx.name).slice(0, 200);
    const entry = { date: tx.date, category, description, amount: Math.abs(tx.amount) };

    if (money) {
      const revenue = await db.revenue.create({ data: entry });
      await db.bankTransaction.update({
        where: { id },
        data: { status: "ADDED", category, revenueId: revenue.id, expenseId: null },
      });
    } else {
      const expense = await db.expense.create({ data: entry });
      await db.bankTransaction.update({
        where: { id },
        data: { status: "ADDED", category, expenseId: expense.id, revenueId: null },
      });
    }
    return { ok: true } as const;
  });
}

export async function ignoreBankTransaction(id: string): Promise<ActionResult> {
  const tx = await prisma.bankTransaction.findUnique({ where: { id } });
  if (!tx) return fail(404, "Transaction not found");
  if (tx.status === "ADDED" && isLinked(tx)) return fail(409, "Already added; edit or remove it on the Expenses / Revenue page");
  await prisma.bankTransaction.update({ where: { id }, data: { status: "IGNORED", category: null } });
  return { ok: true };
}

/** Puts an ignored transaction back in the review inbox. */
export async function restoreBankTransaction(id: string): Promise<ActionResult> {
  const result = await prisma.bankTransaction.updateMany({ where: { id, status: "IGNORED" }, data: { status: "NEW" } });
  return result.count > 0 ? { ok: true } : fail(404, "Transaction isn't ignored");
}

/** "That's the one I already typed in": point the bank transaction at the existing entry instead of creating a second one. */
export async function linkBankTransaction(id: string, entryId: string): Promise<ActionResult> {
  return prisma.$transaction(async (db) => {
    const tx = await db.bankTransaction.findUnique({ where: { id } });
    if (!tx) return fail(404, "Transaction not found");
    if (tx.status === "ADDED" && isLinked(tx)) return fail(409, "Already added");

    const money = directionOf(tx.amount) === "IN";
    const entry = money
      ? await db.revenue.findUnique({ where: { id: entryId } })
      : await db.expense.findUnique({ where: { id: entryId } });
    if (!entry) return fail(404, "That entry no longer exists");

    const alreadyClaimed = await db.bankTransaction.count({
      where: money ? { revenueId: entryId, NOT: { id } } : { expenseId: entryId, NOT: { id } },
    });
    if (alreadyClaimed > 0) return fail(409, "That entry is already matched to another transaction");

    await db.bankTransaction.update({
      where: { id },
      data: {
        status: "ADDED",
        category: entry.category,
        expenseId: money ? null : entryId,
        revenueId: money ? entryId : null,
      },
    });
    return { ok: true } as const;
  });
}

/** Saves "always do this for this merchant" so the next charge from it comes pre-filled. */
export async function rememberRule(
  id: string,
  action: "ADD" | "IGNORE",
  category: string | null
): Promise<void> {
  const tx = await prisma.bankTransaction.findUnique({ where: { id } });
  if (!tx) return;
  const merchantKey = normalizeMerchantKey(tx.name, tx.merchantName);
  if (!merchantKey) return;
  const direction = directionOf(tx.amount);
  const data = { action, category: action === "ADD" ? category : null };
  await prisma.bankRule.upsert({
    where: { merchantKey_direction: { merchantKey, direction } },
    create: { merchantKey, direction, ...data },
    update: data,
  });
}

/**
 * "Add all suggested": files every selected transaction that has a confident
 * suggestion, meaning one from the user's own saved rules or an obvious transfer
 * to ignore. Plaid's category guesses only pre-fill the dropdown and are never
 * applied in bulk. Suggestions are recomputed here, not trusted from the client.
 */
export async function applySuggestions(ids: string[]): Promise<{ added: number; ignored: number; skipped: number }> {
  const [txs, rules] = await Promise.all([
    prisma.bankTransaction.findMany({ where: { id: { in: ids }, status: { in: ["NEW", "ADDED"] } } }),
    prisma.bankRule.findMany(),
  ]);
  const counts = { added: 0, ignored: 0, skipped: 0 };
  for (const tx of txs) {
    const suggestion = suggestFor(tx, rules);
    if (!suggestion || !isBulkSafe(suggestion)) {
      counts.skipped++;
      continue;
    }
    const result =
      suggestion.action === "IGNORE"
        ? await ignoreBankTransaction(tx.id)
        : await addBankTransaction(tx.id, { category: suggestion.category ?? "Other" });
    if (!result.ok) counts.skipped++;
    else if (suggestion.action === "IGNORE") counts.ignored++;
    else counts.added++;
  }
  return counts;
}
