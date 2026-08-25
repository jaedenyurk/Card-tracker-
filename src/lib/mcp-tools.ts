import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { prisma } from "./prisma";
import { dollarsToCents, centsToDollars } from "./money";
import {
  computeCashFlowSummaryForPeriod,
  computePortfolioSummaryForPeriod,
  rankByROI,
  type PeriodKey,
} from "./calculations";
import { toCardRow } from "./rows";
import { toLotRow } from "./lots";

const SPORTS = ["Baseball", "Basketball", "Football", "Hockey", "Soccer", "Golf", "Other"] as const;
const GRADING_COMPANIES = ["PSA", "BGS", "SGC", "CGC", "TAG"] as const;
const EXPENSE_CATEGORIES = ["Grading", "Shipping", "Supplies", "Fees", "Travel", "Software", "Other"] as const;
const REVENUE_CATEGORIES = ["Card Sale", "Lot Sale", "Shipping", "Other"] as const;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true as const };
}

/**
 * Every tool here is a thin wrapper over the same Prisma models and
 * calculation functions the web app itself uses (see src/lib/calculations.ts,
 * src/app/api/**). Write tools intentionally never delete anything — only
 * add/update — so a misfired call can't wipe out real business data.
 */
export function registerTools(server: McpServer): void {
  server.registerTool(
    "add_card",
    {
      title: "Add Card",
      description: "Log a newly purchased sports card into inventory.",
      inputSchema: z.object({
        player: z.string().describe("Player name, e.g. 'Victor Wembanyama'"),
        sport: z.enum(SPORTS),
        year: z.string().optional(),
        setName: z.string().optional(),
        cardNumber: z.string().optional(),
        parallel: z.string().optional().describe("e.g. 'Prizm Silver', 'Refractor'"),
        gradingCo: z.enum(GRADING_COMPANIES).optional().describe("Omit if raw/ungraded"),
        grade: z.string().optional().describe("e.g. '10', '9.5'"),
        purchaseDate: z.string().describe("YYYY-MM-DD"),
        purchasePrice: z.number().nonnegative().describe("Dollar amount paid, e.g. 45.00"),
        purchasePlatform: z.string().optional().describe("eBay, COMC, local show, etc."),
        marketValue: z.number().nonnegative().optional().describe("Estimated current value in dollars"),
        notes: z.string().optional(),
      }),
    },
    async (input) => {
      const purchasePrice = dollarsToCents(input.purchasePrice);
      if (purchasePrice == null) return errorResult("purchasePrice is required.");
      const card = await prisma.card.create({
        data: {
          player: input.player.trim(),
          sport: input.sport,
          year: input.year || null,
          setName: input.setName || null,
          cardNumber: input.cardNumber || null,
          parallel: input.parallel || null,
          gradingCo: input.gradingCo || null,
          grade: input.grade || null,
          notes: input.notes || null,
          purchaseDate: new Date(input.purchaseDate),
          purchasePrice,
          purchasePlatform: input.purchasePlatform || null,
          marketValue: dollarsToCents(input.marketValue ?? null),
        },
      });
      return json({ id: card.id, player: card.player, status: card.status, purchasePrice: centsToDollars(card.purchasePrice) });
    }
  );

  server.registerTool(
    "mark_card_sold",
    {
      title: "Mark Card Sold",
      description: "Mark a held card as sold. Call search_cards first to find the card's id.",
      inputSchema: z.object({
        cardId: z.string(),
        soldDate: z.string().describe("YYYY-MM-DD"),
        soldPrice: z.number().nonnegative().describe("Sale price in dollars"),
        soldPlatform: z.string().optional(),
      }),
    },
    async ({ cardId, soldDate, soldPrice, soldPlatform }) => {
      const existing = await prisma.card.findUnique({ where: { id: cardId } });
      if (!existing) return errorResult(`No card found with id ${cardId}.`);
      const cents = dollarsToCents(soldPrice);
      if (cents == null) return errorResult("soldPrice is required.");
      const updated = await prisma.card.update({
        where: { id: cardId },
        data: { status: "SOLD", soldDate: new Date(soldDate), soldPrice: cents, soldPlatform: soldPlatform || null },
      });
      return json({ id: updated.id, player: updated.player, status: updated.status, soldPrice: centsToDollars(updated.soldPrice) });
    }
  );

  server.registerTool(
    "update_card_value",
    {
      title: "Update Card Estimated Value",
      description:
        "Update a held card's estimated current market value, used for unrealized P&L. Call search_cards first to find the card's id.",
      inputSchema: z.object({
        cardId: z.string(),
        marketValue: z.number().nonnegative().describe("Estimated value in dollars"),
      }),
    },
    async ({ cardId, marketValue }) => {
      const existing = await prisma.card.findUnique({ where: { id: cardId } });
      if (!existing) return errorResult(`No card found with id ${cardId}.`);
      const updated = await prisma.card.update({
        where: { id: cardId },
        data: { marketValue: dollarsToCents(marketValue) },
      });
      return json({ id: updated.id, player: updated.player, marketValue: centsToDollars(updated.marketValue) });
    }
  );

  server.registerTool(
    "add_expense",
    {
      title: "Add Expense",
      description: "Log a business expense. This feeds Total Expenses on the dashboard.",
      inputSchema: z.object({
        date: z.string().describe("YYYY-MM-DD"),
        category: z.enum(EXPENSE_CATEGORIES),
        description: z.string(),
        amount: z.number().nonnegative().describe("Dollar amount"),
        cardId: z
          .string()
          .optional()
          .describe("Optionally link to a specific card, e.g. a grading fee. Use search_cards to find the id."),
      }),
    },
    async ({ date, category, description, amount, cardId }) => {
      const cents = dollarsToCents(amount);
      if (cents == null) return errorResult("amount is required.");
      const expense = await prisma.expense.create({
        data: { date: new Date(date), category, description: description.trim(), amount: cents, cardId: cardId || null },
      });
      return json({ id: expense.id, description: expense.description, category: expense.category, amount: centsToDollars(expense.amount) });
    }
  );

  server.registerTool(
    "add_revenue",
    {
      title: "Add Revenue",
      description: "Log money taken in. This feeds Total Revenue and Net P&L on the dashboard — nothing else does.",
      inputSchema: z.object({
        date: z.string().describe("YYYY-MM-DD"),
        category: z.enum(REVENUE_CATEGORIES),
        description: z.string(),
        amount: z.number().nonnegative().describe("Dollar amount"),
        cardId: z.string().optional().describe("Optional reference link to a card. Use search_cards to find the id."),
      }),
    },
    async ({ date, category, description, amount, cardId }) => {
      const cents = dollarsToCents(amount);
      if (cents == null) return errorResult("amount is required.");
      const revenue = await prisma.revenue.create({
        data: { date: new Date(date), category, description: description.trim(), amount: cents, cardId: cardId || null },
      });
      return json({ id: revenue.id, description: revenue.description, category: revenue.category, amount: centsToDollars(revenue.amount) });
    }
  );

  server.registerTool(
    "add_lot",
    {
      title: "Add Lot Buy",
      description: "Log a bulk purchase of multiple cards bought together for one total price.",
      inputSchema: z.object({
        name: z.string(),
        source: z.string().optional().describe("eBay, local show, etc."),
        purchaseDate: z.string().describe("YYYY-MM-DD"),
        totalCards: z.number().int().positive(),
        totalCost: z.number().nonnegative().describe("Total dollar amount paid for the whole lot"),
        notes: z.string().optional(),
      }),
    },
    async ({ name, source, purchaseDate, totalCards, totalCost, notes }) => {
      const cents = dollarsToCents(totalCost);
      if (cents == null) return errorResult("totalCost is required.");
      const lot = await prisma.lot.create({
        data: {
          name: name.trim(),
          source: source || null,
          purchaseDate: new Date(purchaseDate),
          totalCards,
          totalCost: cents,
          notes: notes || null,
        },
      });
      return json({ id: lot.id, name: lot.name, totalCards: lot.totalCards, totalCost: centsToDollars(lot.totalCost) });
    }
  );

  server.registerTool(
    "add_lot_sale",
    {
      title: "Log Lot Sale",
      description:
        "Record some number of cards sold out of a lot, with the profit for that sale. Call list_lots first to find the lot's id and how many cards remain.",
      inputSchema: z.object({
        lotId: z.string(),
        saleDate: z.string().describe("YYYY-MM-DD"),
        quantity: z.number().int().positive().describe("Number of cards sold in this transaction"),
        profit: z.number().describe("Profit in dollars for this sale (negative for a loss)"),
        notes: z.string().optional(),
      }),
    },
    async ({ lotId, saleDate, quantity, profit, notes }) => {
      const lot = await prisma.lot.findUnique({ where: { id: lotId }, include: { sales: true } });
      if (!lot) return errorResult(`No lot found with id ${lotId}.`);
      const alreadySold = lot.sales.reduce((sum, s) => sum + s.quantity, 0);
      const remaining = lot.totalCards - alreadySold;
      if (quantity > remaining) return errorResult(`Only ${remaining} card(s) remain in "${lot.name}".`);
      const cents = dollarsToCents(profit);
      if (cents == null) return errorResult("profit is required.");
      await prisma.lotSale.create({
        data: { lotId, saleDate: new Date(saleDate), quantity, profit: cents, notes: notes || null },
      });
      return json({ lot: lot.name, quantitySold: quantity, profit: centsToDollars(cents), remainingAfter: remaining - quantity });
    }
  );

  server.registerTool(
    "search_cards",
    {
      title: "Search Cards",
      description: "List/search inventory cards, with computed cost basis, current value, profit, and ROI for each.",
      inputSchema: z.object({
        status: z.enum(["HELD", "SOLD", "ALL"]).optional().describe("Defaults to ALL"),
        sport: z.string().optional().describe("Exact match"),
        query: z.string().optional().describe("Case-insensitive substring match on player name"),
        limit: z.number().int().positive().max(200).optional().describe("Defaults to 50"),
      }),
    },
    async ({ status, sport, query, limit }) => {
      const cards = await prisma.card.findMany({
        where: {
          ...(status && status !== "ALL" ? { status } : {}),
          ...(sport ? { sport } : {}),
          ...(query ? { player: { contains: query, mode: "insensitive" as const } } : {}),
        },
        orderBy: { purchaseDate: "desc" },
        take: limit ?? 50,
      });
      const expenses = await prisma.expense.findMany();
      const rows = cards.map((c) => toCardRow(c, expenses));
      return json(
        rows.map((r) => ({
          id: r.id,
          player: r.player,
          sport: r.sport,
          year: r.year,
          grading: r.gradingLabel,
          status: r.status,
          purchasePrice: centsToDollars(r.purchasePrice),
          costBasis: centsToDollars(r.costBasis),
          currentValue: r.currentValue != null ? centsToDollars(r.currentValue) : null,
          profit: r.profit != null ? centsToDollars(r.profit) : null,
          roi: r.roi != null ? round1(r.roi) : null,
          purchaseDate: r.purchaseDate.slice(0, 10),
          soldDate: r.soldDate?.slice(0, 10) ?? null,
        }))
      );
    }
  );

  server.registerTool(
    "list_lots",
    {
      title: "List Lots",
      description: "List all lot buys with cards sold/remaining, cost per card, realized profit, and ROI.",
      inputSchema: z.object({}),
    },
    async () => {
      const lots = await prisma.lot.findMany({ include: { sales: true }, orderBy: { purchaseDate: "desc" } });
      const rows = lots.map((l) => toLotRow(l, l.sales));
      return json(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          source: r.source,
          purchaseDate: r.purchaseDate.slice(0, 10),
          totalCards: r.totalCards,
          soldCount: r.soldCount,
          remaining: r.remaining,
          totalCost: centsToDollars(r.totalCost),
          costPerCard: centsToDollars(Math.round(r.costPerCard)),
          realizedProfit: centsToDollars(r.realizedProfit),
          roi: r.roi != null ? round1(r.roi) : null,
        }))
      );
    }
  );

  server.registerTool(
    "list_expenses",
    {
      title: "List Expenses",
      description: "List logged expenses, optionally filtered by date range or category.",
      inputSchema: z.object({
        startDate: z.string().optional().describe("YYYY-MM-DD, inclusive"),
        endDate: z.string().optional().describe("YYYY-MM-DD, inclusive"),
        category: z.enum(EXPENSE_CATEGORIES).optional(),
      }),
    },
    async ({ startDate, endDate, category }) => {
      const expenses = await prisma.expense.findMany({
        where: {
          ...(category ? { category } : {}),
          ...(startDate || endDate
            ? { date: { ...(startDate ? { gte: new Date(startDate) } : {}), ...(endDate ? { lte: new Date(endDate) } : {}) } }
            : {}),
        },
        include: { card: { select: { player: true } } },
        orderBy: { date: "desc" },
      });
      return json(
        expenses.map((e) => ({
          id: e.id,
          date: e.date.toISOString().slice(0, 10),
          category: e.category,
          description: e.description,
          amount: centsToDollars(e.amount),
          linkedCard: e.card?.player ?? null,
        }))
      );
    }
  );

  server.registerTool(
    "list_revenue",
    {
      title: "List Revenue",
      description: "List logged revenue entries, optionally filtered by date range or category.",
      inputSchema: z.object({
        startDate: z.string().optional().describe("YYYY-MM-DD, inclusive"),
        endDate: z.string().optional().describe("YYYY-MM-DD, inclusive"),
        category: z.enum(REVENUE_CATEGORIES).optional(),
      }),
    },
    async ({ startDate, endDate, category }) => {
      const revenue = await prisma.revenue.findMany({
        where: {
          ...(category ? { category } : {}),
          ...(startDate || endDate
            ? { date: { ...(startDate ? { gte: new Date(startDate) } : {}), ...(endDate ? { lte: new Date(endDate) } : {}) } }
            : {}),
        },
        include: { card: { select: { player: true } } },
        orderBy: { date: "desc" },
      });
      return json(
        revenue.map((r) => ({
          id: r.id,
          date: r.date.toISOString().slice(0, 10),
          category: r.category,
          description: r.description,
          amount: centsToDollars(r.amount),
          linkedCard: r.card?.player ?? null,
        }))
      );
    }
  );

  server.registerTool(
    "get_dashboard_summary",
    {
      title: "Get Dashboard Summary",
      description:
        "Get the same KPIs shown on the app's Dashboard: Total Revenue/Expenses/Net P&L (from the Revenue and Expenses pages only), plus Realized ROI, inventory value, unrealized P&L, and Overall ROI (from Inventory).",
      inputSchema: z.object({
        period: z.enum(["MONTH", "YTD", "ALL"]).optional().describe("Defaults to MONTH (current calendar month)"),
      }),
    },
    async ({ period }) => {
      const p: PeriodKey = period ?? "MONTH";
      const [cards, expenses, revenues] = await Promise.all([
        prisma.card.findMany(),
        prisma.expense.findMany(),
        prisma.revenue.findMany(),
      ]);
      const cash = computeCashFlowSummaryForPeriod(revenues, expenses, p);
      const portfolio = computePortfolioSummaryForPeriod(cards, expenses, p);
      return json({
        period: p,
        totalRevenue: centsToDollars(cash.totalRevenue),
        totalExpenses: centsToDollars(cash.totalExpenses),
        netPnL: centsToDollars(cash.netPnL),
        revenueEntries: cash.revenueCount,
        expenseEntries: cash.expenseCount,
        realizedROI: portfolio.realizedROI != null ? round1(portfolio.realizedROI) : null,
        soldCards: portfolio.soldCount,
        heldCards: portfolio.heldCount,
        inventoryCost: centsToDollars(portfolio.inventoryCostValue),
        inventoryEstValue: portfolio.inventoryMarketValue != null ? centsToDollars(portfolio.inventoryMarketValue) : null,
        unrealizedPnL: portfolio.unrealizedProfit != null ? centsToDollars(portfolio.unrealizedProfit) : null,
        overallROI: portfolio.overallROI != null ? round1(portfolio.overallROI) : null,
      });
    }
  );

  server.registerTool(
    "get_top_movers",
    {
      title: "Get Top/Worst Performing Cards",
      description: "Rank cards by ROI — realized for sold cards, unrealized for held cards with an estimated value set.",
      inputSchema: z.object({
        direction: z.enum(["best", "worst"]).optional().describe("Defaults to best"),
        limit: z.number().int().positive().max(50).optional().describe("Defaults to 5"),
      }),
    },
    async ({ direction, limit }) => {
      const [cards, expenses] = await Promise.all([prisma.card.findMany(), prisma.expense.findMany()]);
      const ranked = rankByROI(cards, expenses, direction ?? "best", limit ?? 5);
      return json(
        ranked.map((r) => {
          const card = cards.find((c) => c.id === r.card.id)!;
          return { id: card.id, player: card.player, sport: card.sport, roi: round1(r.roi), profit: centsToDollars(r.profit) };
        })
      );
    }
  );
}
