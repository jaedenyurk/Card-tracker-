import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { plaidConfigured } from "@/lib/plaid";
import { inPeriod, type PeriodKey } from "@/lib/calculations";
import { directionOf, findDuplicate, suggestFor } from "@/lib/bankFeed";
import { BankFeed, type BankItemRow, type BankRuleRow, type BankTab, type BankTxRow } from "@/components/BankFeed";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;
const STALE_AFTER_MS = 3 * 60 * 60 * 1000;
const MAX_ROWS = 300;

// Only accounts the user is tracking feed the lists, so a personal card can be switched off.
const tracked: Prisma.BankTransactionWhereInput = { account: { tracked: true } };

// "Added" rows whose expense/revenue was later deleted have lost their link; they go back to review.
const WHERE: Record<BankTab, Prisma.BankTransactionWhereInput> = {
  review: {
    ...tracked,
    OR: [{ status: "NEW" }, { status: "ADDED", expenseId: null, revenueId: null }],
  },
  added: {
    ...tracked,
    status: "ADDED",
    OR: [{ expenseId: { not: null } }, { revenueId: { not: null } }],
  },
  ignored: { ...tracked, status: "IGNORED" },
};

export default async function BankPage({ searchParams }: { searchParams: { tab?: string } }) {
  const tab: BankTab = searchParams.tab === "added" || searchParams.tab === "ignored" ? searchParams.tab : "review";
  const configured = plaidConfigured();

  const now = new Date();
  const [items, rules, summary, txs] = await Promise.all([
    prisma.plaidItem.findMany({
      // Never select accessToken: it stays on the server.
      select: {
        id: true,
        institutionName: true,
        lastSyncedAt: true,
        syncError: true,
        accounts: { select: { id: true, name: true, mask: true, type: true, tracked: true }, orderBy: { name: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.bankRule.findMany({ orderBy: { createdAt: "desc" } }),
    // Just enough of every tracked transaction to count each tab for each period.
    prisma.bankTransaction.findMany({
      where: tracked,
      select: { date: true, status: true, expenseId: true, revenueId: true },
    }),
    prisma.bankTransaction.findMany({
      where: WHERE[tab],
      include: { account: { select: { name: true, mask: true } } },
      orderBy: { date: "desc" },
      take: MAX_ROWS,
    }),
  ]);

  // Spot transactions already typed in by hand: same amount, a few days either side,
  // and not already matched to another bank transaction.
  const duplicates = new Map<string, { id: string; description: string; date: string }>();
  if (tab === "review" && txs.length > 0) {
    const times = txs.map((t) => t.date.getTime());
    const range = { gte: new Date(Math.min(...times) - 4 * DAY_MS), lte: new Date(Math.max(...times) + 4 * DAY_MS) };
    const [expenses, revenues, linked] = await Promise.all([
      prisma.expense.findMany({ where: { date: range }, select: { id: true, date: true, amount: true, description: true } }),
      prisma.revenue.findMany({ where: { date: range }, select: { id: true, date: true, amount: true, description: true } }),
      prisma.bankTransaction.findMany({
        where: { OR: [{ expenseId: { not: null } }, { revenueId: { not: null } }] },
        select: { expenseId: true, revenueId: true },
      }),
    ]);
    const claimed = new Set(linked.flatMap((l) => [l.expenseId, l.revenueId]).filter((id): id is string => id != null));
    for (const tx of txs) {
      const match = findDuplicate(tx, directionOf(tx.amount) === "IN" ? revenues : expenses, claimed);
      if (match) {
        claimed.add(match.id);
        duplicates.set(tx.id, { id: match.id, description: match.description, date: new Date(match.date).toISOString() });
      }
    }
  }

  const rows: BankTxRow[] = txs.map((t) => ({
    id: t.id,
    date: t.date.toISOString(),
    name: t.name,
    merchantName: t.merchantName,
    amount: t.amount,
    account: `${t.account.name}${t.account.mask ? ` ··${t.account.mask}` : ""}`,
    category: t.category,
    linkedTo: t.expenseId ? "expense" : t.revenueId ? "revenue" : null,
    suggestion: tab === "review" ? suggestFor(t, rules) : null,
    duplicate: duplicates.get(t.id) ?? null,
  }));

  const itemRows: BankItemRow[] = items.map((i) => ({
    ...i,
    lastSyncedAt: i.lastSyncedAt?.toISOString() ?? null,
  }));
  const ruleRows: BankRuleRow[] = rules.map((r) => ({
    id: r.id,
    merchantKey: r.merchantKey,
    direction: r.direction === "IN" ? "IN" : "OUT",
    action: r.action === "IGNORE" ? "IGNORE" : "ADD",
    category: r.category,
  }));

  // Same buckets as the WHERE clauses above, counted per period so the toggle can show matching numbers.
  const PERIODS: PeriodKey[] = ["MONTH", "YTD", "ALL"];
  const blank = (): Record<PeriodKey, number> => ({ MONTH: 0, YTD: 0, ALL: 0 });
  const counts: Record<BankTab, Record<PeriodKey, number>> = { review: blank(), added: blank(), ignored: blank() };
  for (const t of summary) {
    const bucket: BankTab =
      t.status === "IGNORED" ? "ignored" : t.status === "NEW" || (!t.expenseId && !t.revenueId) ? "review" : "added";
    for (const p of PERIODS) if (inPeriod(t.date, p, now)) counts[bucket][p]++;
  }

  const stale = items.some(
    (i) => i.accounts.some((a) => a.tracked) && (!i.lastSyncedAt || now.getTime() - i.lastSyncedAt.getTime() > STALE_AFTER_MS)
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Automatic entry"
        title="Bank Feed"
        subtitle="Bank and credit card transactions land here to sort into categories, so you don't have to type them in."
      />

      <BankFeed
        configured={configured}
        items={itemRows}
        rules={ruleRows}
        rows={rows}
        counts={counts}
        tab={tab}
        stale={stale}
        truncated={counts[tab].ALL > MAX_ROWS}
      />
    </div>
  );
}
