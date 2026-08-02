import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cardCostBasis,
  cardRealizedProfit,
  cardRealizedROI,
  cardUnrealizedProfit,
  cardUnrealizedROI,
  computePortfolioSummary,
  monthlySeries,
  yearlySeries,
  rankByROI,
} from "../calculations";
import type { CardLike, ExpenseLike } from "../types";

function card(overrides: Partial<CardLike> & { id: string }): CardLike {
  return {
    purchasePrice: 0,
    purchaseDate: "2026-01-01",
    soldPrice: null,
    soldDate: null,
    marketValue: null,
    status: "HELD",
    ...overrides,
  };
}

function expense(overrides: Partial<ExpenseLike> & { id: string }): ExpenseLike {
  return {
    amount: 0,
    date: "2026-01-01",
    category: "Other",
    cardId: null,
    ...overrides,
  };
}

test("cardCostBasis includes only expenses linked to that card", () => {
  const c = card({ id: "c1", purchasePrice: 10000 });
  const expenses = [
    expense({ id: "e1", cardId: "c1", amount: 1500 }),
    expense({ id: "e2", cardId: "c2", amount: 9999 }),
    expense({ id: "e3", cardId: null, amount: 500 }),
  ];
  assert.equal(cardCostBasis(c, expenses), 11500);
});

test("cardRealizedProfit / ROI for a sold card", () => {
  const c = card({
    id: "c1",
    purchasePrice: 10000,
    status: "SOLD",
    soldPrice: 15000,
    soldDate: "2026-02-01",
  });
  const expenses = [expense({ id: "e1", cardId: "c1", amount: 2000 })];
  // cost basis = 12000, profit = 15000 - 12000 = 3000
  assert.equal(cardRealizedProfit(c, expenses), 3000);
  assert.equal(cardRealizedROI(c, expenses), 25);
});

test("cardRealizedProfit is null for a held card", () => {
  const c = card({ id: "c1", purchasePrice: 5000 });
  assert.equal(cardRealizedProfit(c, []), null);
  assert.equal(cardRealizedROI(c, []), null);
});

test("cardUnrealizedProfit / ROI uses marketValue for held cards", () => {
  const c = card({ id: "c1", purchasePrice: 10000, marketValue: 13000 });
  assert.equal(cardUnrealizedProfit(c, []), 3000);
  assert.equal(cardUnrealizedROI(c, []), 30);
});

test("cardUnrealizedProfit is null without a market value", () => {
  const c = card({ id: "c1", purchasePrice: 10000 });
  assert.equal(cardUnrealizedProfit(c, []), null);
});

test("computePortfolioSummary: mixed held + sold cards, linked + general expenses", () => {
  const cards: CardLike[] = [
    card({
      id: "sold1",
      purchasePrice: 5000,
      status: "SOLD",
      soldPrice: 12000,
      soldDate: "2026-03-15",
    }),
    card({
      id: "sold2",
      purchasePrice: 8000,
      status: "SOLD",
      soldPrice: 6000, // a loss
      soldDate: "2026-03-20",
    }),
    card({ id: "held1", purchasePrice: 4000, marketValue: 6000 }),
    card({ id: "held2", purchasePrice: 3000 }), // no market value
  ];
  const expenses: ExpenseLike[] = [
    expense({ id: "e1", cardId: "sold1", amount: 1000 }), // grading fee on sold1
    expense({ id: "e2", cardId: null, amount: 2500 }), // general operating expense
  ];

  const summary = computePortfolioSummary(cards, expenses);

  assert.equal(summary.cardCount, 4);
  assert.equal(summary.soldCount, 2);
  assert.equal(summary.heldCount, 2);

  // revenue = 12000 + 6000
  assert.equal(summary.totalRevenue, 18000);
  // cogs = (5000+1000) + 8000 = 14000
  assert.equal(summary.cogs, 14000);
  assert.equal(summary.generalExpenses, 2500);
  assert.equal(summary.totalExpenses, 16500);
  assert.equal(summary.netPnL, 18000 - 16500);

  assert.equal(summary.realizedProfit, 18000 - 14000);
  assert.equal(summary.realizedROI, ((18000 - 14000) / 14000) * 100);

  // inventory cost value = 4000 + 3000 = 7000
  assert.equal(summary.inventoryCostValue, 7000);
  // held1 has market value 6000, held2 has none -> falls back to cost basis (3000)
  assert.equal(summary.inventoryMarketValue, 6000 + 3000);
  assert.equal(summary.unrealizedProfit, 9000 - 7000);
});

test("computePortfolioSummary handles an empty portfolio without dividing by zero", () => {
  const summary = computePortfolioSummary([], []);
  assert.equal(summary.totalRevenue, 0);
  assert.equal(summary.realizedROI, null);
  assert.equal(summary.overallROI, null);
  assert.equal(summary.inventoryMarketValue, null);
});

test("monthlySeries fills gaps between the first and last active month", () => {
  const cards: CardLike[] = [
    card({ id: "c1", purchasePrice: 1000, status: "SOLD", soldPrice: 2000, soldDate: "2026-01-10" }),
    card({ id: "c2", purchasePrice: 1000, status: "SOLD", soldPrice: 2000, soldDate: "2026-03-10" }),
  ];
  const series = monthlySeries(cards, []);
  assert.equal(series.length, 3); // Jan, Feb (empty), Mar
  assert.deepEqual(series.map((p) => p.key), ["2026-01", "2026-02", "2026-03"]);
  assert.equal(series[1].revenue, 0);
  assert.equal(series[1].profit, 0);
  assert.equal(series[0].revenue, 2000);
  assert.equal(series[0].profit, 2000 - 1000);
});

test("yearlySeries rolls monthly data up correctly", () => {
  const cards: CardLike[] = [
    card({ id: "c1", purchasePrice: 1000, status: "SOLD", soldPrice: 5000, soldDate: "2025-06-01" }),
    card({ id: "c2", purchasePrice: 2000, status: "SOLD", soldPrice: 3000, soldDate: "2026-01-01" }),
  ];
  const years = yearlySeries(cards, []);
  assert.deepEqual(years.map((y) => y.key), ["2025", "2026"]);
  assert.equal(years[0].revenue, 5000);
  assert.equal(years[0].profit, 4000);
  assert.equal(years[1].revenue, 3000);
  assert.equal(years[1].profit, 1000);
});

test("rankByROI sorts sold cards by ROI descending for 'best'", () => {
  const cards: CardLike[] = [
    card({ id: "low", purchasePrice: 10000, status: "SOLD", soldPrice: 11000, soldDate: "2026-01-01" }), // 10%
    card({ id: "high", purchasePrice: 1000, status: "SOLD", soldPrice: 3000, soldDate: "2026-01-01" }), // 200%
  ];
  const ranked = rankByROI(cards, [], "best", 5);
  assert.equal(ranked[0].card.id, "high");
  assert.equal(ranked[1].card.id, "low");
});

test("rankByROI excludes cards with no ROI available (held, no market value)", () => {
  const cards: CardLike[] = [card({ id: "unset", purchasePrice: 1000 })];
  const ranked = rankByROI(cards, [], "best", 5);
  assert.equal(ranked.length, 0);
});
