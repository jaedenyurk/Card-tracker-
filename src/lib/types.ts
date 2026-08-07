export type CardStatus = "HELD" | "SOLD";

// Shape shared by the Prisma Card model and any plain object used in tests.
export interface CardLike {
  id: string;
  purchasePrice: number; // cents
  purchaseDate: Date | string;
  soldPrice: number | null;
  soldDate: Date | string | null;
  marketValue: number | null;
  status: CardStatus;
}

export interface ExpenseLike {
  id: string;
  amount: number; // cents
  date: Date | string;
  category: string;
  cardId: string | null;
}

// Shape shared by the Prisma Revenue model and any plain object used in tests.
export interface RevenueLike {
  id: string;
  amount: number; // cents
  date: Date | string;
  category: string;
}

// The dashboard's headline cash-flow figures: driven entirely by the Revenue
// and Expenses pages, independent of card sale/cost-basis data.
export interface CashFlowSummary {
  totalRevenue: number; // cents, sum of Revenue entries in the period
  totalExpenses: number; // cents, sum of ALL Expense entries in the period
  netPnL: number; // totalRevenue - totalExpenses
  revenueCount: number;
  expenseCount: number;
}

export interface PortfolioSummary {
  cardCount: number;
  heldCount: number;
  soldCount: number;

  totalRevenue: number; // cents, sum of soldPrice
  cogs: number; // cents, cost basis of sold cards
  generalExpenses: number; // cents, expenses not tied to a card
  totalExpenses: number; // cogs + generalExpenses
  netPnL: number; // totalRevenue - totalExpenses

  realizedProfit: number; // totalRevenue - cogs
  realizedROI: number | null; // realizedProfit / cogs * 100

  inventoryCostValue: number; // cost basis of held cards
  inventoryMarketValue: number | null; // sum of marketValue for held cards that have one set
  unrealizedProfit: number | null;
  unrealizedROI: number | null;

  overallROI: number | null; // (realized + unrealized profit) / (cogs + inventory cost value) * 100

  allTimeCapitalDeployed: number; // cogs + inventoryCostValue (total ever spent acquiring + prepping cards)
}

// Shape shared by the Prisma Lot model and any plain object used in tests.
export interface LotLike {
  id: string;
  totalCards: number;
  totalCost: number; // cents
}

export interface LotSaleLike {
  id: string;
  lotId: string;
  quantity: number;
  profit: number; // cents
}

export interface LotsSummary {
  lotCount: number;
  totalCardsBought: number;
  totalCardsSold: number;
  totalCardsRemaining: number;
  totalInvested: number; // cents
  totalRealizedProfit: number; // cents
  overallROI: number | null; // totalRealizedProfit / totalInvested * 100
  percentSold: number | null; // totalCardsSold / totalCardsBought * 100
}

export interface MonthlyPoint {
  key: string; // "2026-01"
  label: string; // "Jan 2026"
  revenue: number;
  expenses: number;
  profit: number;
}

export interface YearlyPoint {
  key: string; // "2026"
  revenue: number;
  expenses: number;
  profit: number;
}
