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
  lotSoldCount,
  lotRemainingCards,
  lotCostPerCard,
  lotRealizedProfit,
  lotROI,
  computeLotsSummary,
} from "../calculations";
import type { CardLike, ExpenseLike, LotLike, LotSaleLike } from "../types";

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

function lot(overrides: Partial<LotLike> & { id: string }): LotLike {
  return { totalCards: 10, totalCost: 10000, ...overrides };
}

function lotSale(overrides: Partial<LotSaleLike> & { id: string; lotId: string }): LotSaleLike {
  return { quantity: 1, profit: 0, ...overrides };
}

test("lotSoldCount / lotRemainingCards only count sales for that lot", () => {
  const l = lot({ id: "l1", totalCards: 20 });
  const sales: LotSaleLike[] = [
    lotSale({ id: "s1", lotId: "l1", quantity: 3 }),
    lotSale({ id: "s2", lotId: "l1", quantity: 2 }),
    lotSale({ id: "s3", lotId: "other", quantity: 100 }),
  ];
  assert.equal(lotSoldCount(l, sales), 5);
  assert.equal(lotRemainingCards(l, sales), 15);
});

test("lotCostPerCard divides total cost across the whole lot", () => {
  const l = lot({ id: "l1", totalCards: 25, totalCost: 5000 });
  assert.equal(lotCostPerCard(l), 200);
});

test("lotCostPerCard is 0 for a lot with no cards (avoids divide by zero)", () => {
  const l = lot({ id: "l1", totalCards: 0, totalCost: 5000 });
  assert.equal(lotCostPerCard(l), 0);
});

test("lotRealizedProfit sums manually-entered profit for that lot's sales", () => {
  const l = lot({ id: "l1" });
  const sales: LotSaleLike[] = [
    lotSale({ id: "s1", lotId: "l1", quantity: 2, profit: 1500 }),
    lotSale({ id: "s2", lotId: "l1", quantity: 1, profit: -200 }), // a loss on one sale
    lotSale({ id: "s3", lotId: "other", quantity: 5, profit: 9999 }),
  ];
  assert.equal(lotRealizedProfit(l, sales), 1300);
});

test("lotROI is profit relative to the full amount paid for the lot", () => {
  const l = lot({ id: "l1", totalCost: 10000 });
  const sales: LotSaleLike[] = [lotSale({ id: "s1", lotId: "l1", quantity: 4, profit: 2500 })];
  assert.equal(lotROI(l, sales), 25);
});

test("lotROI is null when the lot had no cost", () => {
  const l = lot({ id: "l1", totalCost: 0 });
  assert.equal(lotROI(l, []), null);
});

test("computeLotsSummary rolls up cards sold, invested, profit, and ROI across lots", () => {
  const lots: LotLike[] = [
    lot({ id: "l1", totalCards: 10, totalCost: 10000 }),
    lot({ id: "l2", totalCards: 20, totalCost: 30000 }),
  ];
  const sales: LotSaleLike[] = [
    lotSale({ id: "s1", lotId: "l1", quantity: 4, profit: 1000 }),
    lotSale({ id: "s2", lotId: "l2", quantity: 5, profit: -500 }),
  ];
  const summary = computeLotsSummary(lots, sales);
  assert.equal(summary.lotCount, 2);
  assert.equal(summary.totalCardsBought, 30);
  assert.equal(summary.totalCardsSold, 9);
  assert.equal(summary.totalCardsRemaining, 21);
  assert.equal(summary.totalInvested, 40000);
  assert.equal(summary.totalRealizedProfit, 500);
  assert.equal(summary.overallROI, (500 / 40000) * 100);
  assert.equal(summary.percentSold, (9 / 30) * 100);
});

test("computeLotsSummary handles no lots without dividing by zero", () => {
  const summary = computeLotsSummary([], []);
  assert.equal(summary.overallROI, null);
  assert.equal(summary.percentSold, null);
});
