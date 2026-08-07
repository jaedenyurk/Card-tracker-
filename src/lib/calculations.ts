import type {
  CardLike,
  ExpenseLike,
  RevenueLike,
  CashFlowSummary,
  PortfolioSummary,
  MonthlyPoint,
  YearlyPoint,
  LotLike,
  LotSaleLike,
  LotsSummary,
} from "./types";

function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

/** Sum of expenses linked to a specific card id. */
export function linkedExpenseTotal(cardId: string, expenses: ExpenseLike[]): number {
  return expenses
    .filter((e) => e.cardId === cardId)
    .reduce((sum, e) => sum + e.amount, 0);
}

/** Cost basis = purchase price + any expenses linked directly to this card (grading, shipping in, etc). */
export function cardCostBasis(card: CardLike, expenses: ExpenseLike[]): number {
  return card.purchasePrice + linkedExpenseTotal(card.id, expenses);
}

/** Realized profit for a sold card. Returns null if the card hasn't sold. */
export function cardRealizedProfit(card: CardLike, expenses: ExpenseLike[]): number | null {
  if (card.status !== "SOLD" || card.soldPrice == null) return null;
  return card.soldPrice - cardCostBasis(card, expenses);
}

/** Realized ROI % for a sold card. Returns null if not sold or cost basis is 0. */
export function cardRealizedROI(card: CardLike, expenses: ExpenseLike[]): number | null {
  const profit = cardRealizedProfit(card, expenses);
  const basis = cardCostBasis(card, expenses);
  if (profit == null || basis === 0) return null;
  return (profit / basis) * 100;
}

/** Unrealized profit for a held card that has a market value estimate. */
export function cardUnrealizedProfit(card: CardLike, expenses: ExpenseLike[]): number | null {
  if (card.status !== "HELD" || card.marketValue == null) return null;
  return card.marketValue - cardCostBasis(card, expenses);
}

export function cardUnrealizedROI(card: CardLike, expenses: ExpenseLike[]): number | null {
  const profit = cardUnrealizedProfit(card, expenses);
  const basis = cardCostBasis(card, expenses);
  if (profit == null || basis === 0) return null;
  return (profit / basis) * 100;
}

/** Generic ROI helper usable for either realized or unrealized, depending on card status. */
export function cardROI(card: CardLike, expenses: ExpenseLike[]): number | null {
  return card.status === "SOLD"
    ? cardRealizedROI(card, expenses)
    : cardUnrealizedROI(card, expenses);
}

export function cardProfit(card: CardLike, expenses: ExpenseLike[]): number | null {
  return card.status === "SOLD"
    ? cardRealizedProfit(card, expenses)
    : cardUnrealizedProfit(card, expenses);
}

/**
 * Full portfolio summary.
 *
 * Accounting convention used throughout: a card's cost (purchase price + any
 * expenses linked to it, e.g. grading fees) is treated as inventory (an asset)
 * until the card sells. When it sells, that full cost basis is recognized as
 * COGS in the same period as the revenue. Expenses NOT linked to a specific
 * card (shipping supplies, subscriptions, travel, etc.) are recognized as
 * operating expenses in the period they were incurred, regardless of
 * inventory status.
 */
export function computePortfolioSummary(
  cards: CardLike[],
  expenses: ExpenseLike[]
): PortfolioSummary {
  const sold = cards.filter((c) => c.status === "SOLD");
  const held = cards.filter((c) => c.status === "HELD");

  const totalRevenue = sold.reduce((sum, c) => sum + (c.soldPrice ?? 0), 0);
  const cogs = sold.reduce((sum, c) => sum + cardCostBasis(c, expenses), 0);
  const generalExpenses = expenses
    .filter((e) => e.cardId == null)
    .reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = cogs + generalExpenses;
  const netPnL = totalRevenue - totalExpenses;

  const realizedProfit = totalRevenue - cogs;
  const realizedROI = cogs !== 0 ? (realizedProfit / cogs) * 100 : null;

  const inventoryCostValue = held.reduce((sum, c) => sum + cardCostBasis(c, expenses), 0);
  const heldWithMarketValue = held.filter((c) => c.marketValue != null);
  const inventoryMarketValue =
    heldWithMarketValue.length > 0
      ? heldWithMarketValue.reduce((sum, c) => sum + (c.marketValue ?? 0), 0) +
        held.filter((c) => c.marketValue == null).reduce((sum, c) => sum + cardCostBasis(c, expenses), 0)
      : null;

  const unrealizedProfit =
    inventoryMarketValue != null ? inventoryMarketValue - inventoryCostValue : null;
  const unrealizedROI =
    unrealizedProfit != null && inventoryCostValue !== 0
      ? (unrealizedProfit / inventoryCostValue) * 100
      : null;

  const allTimeCapitalDeployed = cogs + inventoryCostValue;
  const overallROI =
    allTimeCapitalDeployed !== 0
      ? ((realizedProfit + (unrealizedProfit ?? 0)) / allTimeCapitalDeployed) * 100
      : null;

  return {
    cardCount: cards.length,
    heldCount: held.length,
    soldCount: sold.length,
    totalRevenue,
    cogs,
    generalExpenses,
    totalExpenses,
    netPnL,
    realizedProfit,
    realizedROI,
    inventoryCostValue,
    inventoryMarketValue,
    unrealizedProfit,
    unrealizedROI,
    overallROI,
    allTimeCapitalDeployed,
  };
}

export type PeriodKey = "MONTH" | "YTD" | "ALL";

// Same UTC convention as monthKey below: a date is bucketed by its UTC
// calendar month/year so results don't shift with the server's local timezone.
function inPeriod(date: Date | string, period: PeriodKey, now: Date): boolean {
  if (period === "ALL") return true;
  const d = toDate(date);
  if (period === "MONTH") {
    return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
  }
  return d.getUTCFullYear() === now.getUTCFullYear(); // YTD
}

/**
 * Same shape as computePortfolioSummary, but revenue/COGS/operating-expense
 * figures are scoped to a period (current calendar month, year-to-date, or
 * all-time) based on when a card sold or a general expense was incurred.
 * Held-card figures (inventory cost/value, unrealized P&L) always reflect
 * current holdings, and Overall ROI stays a lifetime figure, since neither
 * belongs to a single period the way a sale or expense does.
 */
export function computePortfolioSummaryForPeriod(
  cards: CardLike[],
  expenses: ExpenseLike[],
  period: PeriodKey,
  now: Date = new Date()
): PortfolioSummary {
  const periodCards = cards.filter(
    (c) => c.status === "HELD" || (c.status === "SOLD" && c.soldDate != null && inPeriod(c.soldDate, period, now))
  );
  // Keep every card-linked expense (its cost basis applies whenever the card sold),
  // but only count general expenses incurred within the period.
  const periodExpenses = expenses.filter((e) => e.cardId != null || inPeriod(e.date, period, now));

  const periodSummary = computePortfolioSummary(periodCards, periodExpenses);
  if (period === "ALL") return periodSummary;

  return { ...periodSummary, overallROI: computePortfolioSummary(cards, expenses).overallROI };
}

/**
 * The dashboard's headline Total Revenue / Total Expenses / Net P&L figures.
 * Deliberately independent of card sale data: revenue is whatever's logged on
 * the Revenue page, expenses are every entry logged on the Expenses page
 * (linked to a card or not), both scoped to the given period by their own date.
 */
export function computeCashFlowSummaryForPeriod(
  revenues: RevenueLike[],
  expenses: ExpenseLike[],
  period: PeriodKey,
  now: Date = new Date()
): CashFlowSummary {
  const periodRevenues = revenues.filter((r) => inPeriod(r.date, period, now));
  const periodExpenses = expenses.filter((e) => inPeriod(e.date, period, now));
  const totalRevenue = periodRevenues.reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

  return {
    totalRevenue,
    totalExpenses,
    netPnL: totalRevenue - totalExpenses,
    revenueCount: periodRevenues.length,
    expenseCount: periodExpenses.length,
  };
}

// Dates coming from <input type="date"> (and from Prisma's DateTime for
// date-only values) parse as UTC midnight. We bucket consistently in UTC
// everywhere so a card sold on "2026-01-01" always lands in January 2026,
// regardless of the server's local timezone.
function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Builds a chronological series of {revenue, expenses, profit} per calendar
 * month, covering every month from the earliest recorded activity to the
 * latest (so gaps show as zero rather than being skipped). Sourced entirely
 * from the Revenue and Expenses pages, same as computeCashFlowSummaryForPeriod.
 */
export function monthlySeries(revenues: RevenueLike[], expenses: ExpenseLike[]): MonthlyPoint[] {
  const buckets = new Map<string, { revenue: number; expenses: number }>();

  const touch = (key: string) => {
    if (!buckets.has(key)) buckets.set(key, { revenue: 0, expenses: 0 });
    return buckets.get(key)!;
  };

  for (const r of revenues) {
    touch(monthKey(toDate(r.date))).revenue += r.amount;
  }
  for (const e of expenses) {
    touch(monthKey(toDate(e.date))).expenses += e.amount;
  }

  if (buckets.size === 0) return [];

  const keys = Array.from(buckets.keys()).sort();
  const [firstY, firstM] = keys[0].split("-").map(Number);
  const [lastY, lastM] = keys[keys.length - 1].split("-").map(Number);

  const points: MonthlyPoint[] = [];
  let y = firstY;
  let m = firstM;
  while (y < lastY || (y === lastY && m <= lastM)) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const bucket = buckets.get(key) ?? { revenue: 0, expenses: 0 };
    points.push({
      key,
      label: `${MONTH_LABELS[m - 1]} ${y}`,
      revenue: bucket.revenue,
      expenses: bucket.expenses,
      profit: bucket.revenue - bucket.expenses,
    });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return points;
}

/** Same idea as monthlySeries but rolled up to whole calendar years. */
export function yearlySeries(revenues: RevenueLike[], expenses: ExpenseLike[]): YearlyPoint[] {
  const monthly = monthlySeries(revenues, expenses);
  const buckets = new Map<string, { revenue: number; expenses: number }>();
  for (const p of monthly) {
    const year = p.key.split("-")[0];
    if (!buckets.has(year)) buckets.set(year, { revenue: 0, expenses: 0 });
    const b = buckets.get(year)!;
    b.revenue += p.revenue;
    b.expenses += p.expenses;
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, b]) => ({
      key,
      revenue: b.revenue,
      expenses: b.expenses,
      profit: b.revenue - b.expenses,
    }));
}

/** Cards ranked by ROI (realized if sold, unrealized if held with a market value). */
export function rankByROI(
  cards: CardLike[],
  expenses: ExpenseLike[],
  direction: "best" | "worst" = "best",
  limit = 5
): Array<{ card: CardLike; roi: number; profit: number }> {
  const withROI = cards
    .map((card) => ({ card, roi: cardROI(card, expenses), profit: cardProfit(card, expenses) }))
    .filter((x): x is { card: CardLike; roi: number; profit: number } => x.roi != null && x.profit != null);

  withROI.sort((a, b) => (direction === "best" ? b.roi - a.roi : a.roi - b.roi));
  return withROI.slice(0, limit);
}

/** Sales recorded against a specific lot. */
export function lotSalesFor(lotId: string, sales: LotSaleLike[]): LotSaleLike[] {
  return sales.filter((s) => s.lotId === lotId);
}

/** Total number of cards sold out of a lot so far. */
export function lotSoldCount(lot: LotLike, sales: LotSaleLike[]): number {
  return lotSalesFor(lot.id, sales).reduce((sum, s) => sum + s.quantity, 0);
}

/** Cards from a lot that haven't been sold yet. */
export function lotRemainingCards(lot: LotLike, sales: LotSaleLike[]): number {
  return lot.totalCards - lotSoldCount(lot, sales);
}

/** Average cost per card in a lot (cents). */
export function lotCostPerCard(lot: LotLike): number {
  return lot.totalCards > 0 ? lot.totalCost / lot.totalCards : 0;
}

/** Sum of manually-entered profit across every sale recorded against a lot. */
export function lotRealizedProfit(lot: LotLike, sales: LotSaleLike[]): number {
  return lotSalesFor(lot.id, sales).reduce((sum, s) => sum + s.profit, 0);
}

/** Profit realized so far relative to the full amount paid for the lot. */
export function lotROI(lot: LotLike, sales: LotSaleLike[]): number | null {
  if (lot.totalCost === 0) return null;
  return (lotRealizedProfit(lot, sales) / lot.totalCost) * 100;
}

/** Rolls up every lot buy into one summary for the lots dashboard section. */
export function computeLotsSummary(lots: LotLike[], sales: LotSaleLike[]): LotsSummary {
  const totalCardsBought = lots.reduce((sum, l) => sum + l.totalCards, 0);
  const totalCardsSold = sales.reduce((sum, s) => sum + s.quantity, 0);
  const totalInvested = lots.reduce((sum, l) => sum + l.totalCost, 0);
  const totalRealizedProfit = sales.reduce((sum, s) => sum + s.profit, 0);

  return {
    lotCount: lots.length,
    totalCardsBought,
    totalCardsSold,
    totalCardsRemaining: totalCardsBought - totalCardsSold,
    totalInvested,
    totalRealizedProfit,
    overallROI: totalInvested !== 0 ? (totalRealizedProfit / totalInvested) * 100 : null,
    percentSold: totalCardsBought !== 0 ? (totalCardsSold / totalCardsBought) * 100 : null,
  };
}

export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function formatPercent(pct: number | null, digits = 1): string {
  if (pct == null) return "—";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(digits)}%`;
}
