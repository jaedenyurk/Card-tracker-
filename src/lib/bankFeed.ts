// Pure logic for the bank feed: turning Plaid transactions into rows, guessing
// a category, remembering rules, and spotting entries that were already typed
// in by hand. No database or Plaid calls here, so it's all unit-tested.

export const EXPENSE_CATEGORIES = ["Grading", "Shipping", "Supplies", "Inventory", "Fees", "Travel", "Software", "Other"];
export const REVENUE_CATEGORIES = ["Card Sale", "Lot Sale", "Shipping", "Owner Contribution", "Other"];

export type Direction = "IN" | "OUT";

export function directionOf(amountCents: number): Direction {
  return amountCents > 0 ? "IN" : "OUT";
}

export interface Suggestion {
  action: "ADD" | "IGNORE";
  category?: string;
  source: "rule" | "plaid";
}

export interface RuleLike {
  merchantKey: string;
  direction: string;
  action: string;
  category: string | null;
}

/** The subset of a Plaid transaction we read. */
export interface PlaidTxLike {
  transaction_id: string;
  account_id: string;
  amount: number; // dollars, Plaid convention: positive = money out
  date: string; // YYYY-MM-DD
  authorized_date?: string | null;
  name: string;
  merchant_name?: string | null;
  pending: boolean;
  personal_finance_category?: { detailed?: string | null } | null;
}

export interface BankTxInput {
  plaidTransactionId: string;
  plaidAccountId: string;
  date: Date;
  name: string;
  merchantName: string | null;
  amount: number; // cents; positive = money in
  plaidCategory: string | null;
  pending: boolean;
}

/**
 * Plaid reports money out as positive dollars; we store cents with money in
 * positive, so an expense is negative and a deposit is positive. The purchase
 * date (authorized_date) is preferred over the posting date when Plaid has it,
 * since that's the day the money was actually spent.
 */
export function plaidTxToInput(t: PlaidTxLike): BankTxInput {
  return {
    plaidTransactionId: t.transaction_id,
    plaidAccountId: t.account_id,
    date: new Date(t.authorized_date || t.date),
    name: t.name,
    merchantName: t.merchant_name ?? null,
    amount: -Math.round(t.amount * 100) || 0, // `|| 0` avoids a stored -0
    plaidCategory: t.personal_finance_category?.detailed ?? null,
    pending: t.pending,
  };
}

/**
 * A stable key for "the same merchant", so one saved rule covers every charge
 * from it. Plaid's cleaned merchant name is used whole when there is one, so
 * "STARBUCKS #1234 SEATTLE WA" and "STARBUCKS #88 AUSTIN TX" both become
 * "starbucks". Without it the key is the statement text minus store numbers and
 * punctuation, trimmed to its first two words, which still tells apart
 * different branches of the same chain ("starbucks seattle").
 */
export function normalizeMerchantKey(name: string, merchantName?: string | null): string {
  const source = (merchantName || name || "").toLowerCase();
  const words = source
    .replace(/[^a-z\s]/g, " ") // drops digits and punctuation, so "#1234" and "*AB12" vanish
    .split(/\s+/)
    .filter((w) => w.length > 1);
  return (merchantName ? words : words.slice(0, 2)).join(" ");
}

// Plaid's detailed categories that mean money moving between the user's own
// accounts or paying off a card: not income or an expense, so they'd be
// double-counted if added. Suggested as "ignore".
const TRANSFER_PREFIXES = [
  "TRANSFER_IN_ACCOUNT_TRANSFER",
  "TRANSFER_OUT_ACCOUNT_TRANSFER",
  "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT",
];

// Only the guesses that are right most of the time; everything else is left for
// the user to pick. These pre-fill the category dropdown, they never add on their own.
const EXPENSE_CATEGORY_MAP: [prefix: string, category: string][] = [
  ["GENERAL_SERVICES_POSTAGE_AND_SHIPPING", "Shipping"],
  ["GENERAL_MERCHANDISE_ONLINE_MARKETPLACES", "Inventory"], // eBay and the like: usually cards being bought
  ["GENERAL_MERCHANDISE_OFFICE_AND_CRAFT", "Supplies"],
  ["BANK_FEES", "Fees"],
  ["TRAVEL", "Travel"],
  ["TRANSPORTATION", "Travel"],
];

/** A best guess from Plaid's own categorization. Null when there's nothing useful to suggest. */
export function suggestFromPlaid(plaidCategory: string | null, direction: Direction): Suggestion | null {
  if (!plaidCategory) return null;
  if (TRANSFER_PREFIXES.some((p) => plaidCategory.startsWith(p))) return { action: "IGNORE", source: "plaid" };
  if (direction === "OUT") {
    const hit = EXPENSE_CATEGORY_MAP.find(([prefix]) => plaidCategory.startsWith(prefix));
    if (hit) return { action: "ADD", category: hit[1], source: "plaid" };
  }
  return null;
}

/** Safe to apply without a human looking: the user's own rule, or a transfer between their own accounts. */
export function isBulkSafe(s: Suggestion): boolean {
  return s.source === "rule" || s.action === "IGNORE";
}

/** A saved rule wins over Plaid's guess. */
export function suggestFor(
  tx: { name: string; merchantName: string | null; amount: number; plaidCategory: string | null },
  rules: RuleLike[]
): Suggestion | null {
  const direction = directionOf(tx.amount);
  const key = normalizeMerchantKey(tx.name, tx.merchantName);
  const rule = key ? rules.find((r) => r.merchantKey === key && r.direction === direction) : undefined;
  if (rule) {
    return rule.action === "IGNORE"
      ? { action: "IGNORE", source: "rule" }
      : { action: "ADD", category: rule.category ?? "Other", source: "rule" };
  }
  return suggestFromPlaid(tx.plaidCategory, direction);
}

/**
 * What saving a new account selection changes: which accounts just got switched
 * on (they need their history pulled) and which just got switched off (their
 * unreviewed transactions are cleared). Ids the item doesn't own are ignored.
 */
export function diffAccountSelection(
  accounts: { id: string; tracked: boolean }[],
  selectedIds: string[]
): { on: string[]; off: string[]; selected: string[] } {
  const wanted = new Set(selectedIds);
  return {
    on: accounts.filter((a) => wanted.has(a.id) && !a.tracked).map((a) => a.id),
    off: accounts.filter((a) => !wanted.has(a.id) && a.tracked).map((a) => a.id),
    selected: accounts.filter((a) => wanted.has(a.id)).map((a) => a.id),
  };
}

export interface EntryLike {
  id: string;
  date: Date | string;
  amount: number; // cents, always positive on Expense / Revenue rows
  description: string;
}

const DAY_MS = 86_400_000;
export const DUPLICATE_WINDOW_DAYS = 3;

/**
 * An Expense / Revenue the user already entered by hand that matches this bank
 * transaction: same amount, within a few days. The closest date wins, and an
 * entry in `claimed` (already matched to another transaction, or already linked)
 * is skipped, so two identical $12 charges match two separate entries.
 */
export function findDuplicate(
  tx: { date: Date | string; amount: number },
  entries: EntryLike[],
  claimed: Set<string> = new Set()
): EntryLike | null {
  const cents = Math.abs(tx.amount);
  const txTime = new Date(tx.date).getTime();
  let best: EntryLike | null = null;
  let bestGap = Infinity;
  for (const e of entries) {
    if (claimed.has(e.id) || e.amount !== cents) continue;
    const gap = Math.abs(new Date(e.date).getTime() - txTime);
    if (gap <= DUPLICATE_WINDOW_DAYS * DAY_MS && gap < bestGap) {
      best = e;
      bestGap = gap;
    }
  }
  return best;
}
