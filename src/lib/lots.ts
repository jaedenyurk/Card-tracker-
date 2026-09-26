import {
  lotCostPerCard,
  lotRealizedProfit,
  lotROI,
  lotSoldCount,
  lotRemainingCards,
  lotRemainingCostValue,
  lotUnrealizedProfit,
} from "./calculations";
import type { LotLike, LotSaleLike } from "./types";

export interface LotSaleRow {
  id: string;
  saleDate: string;
  quantity: number;
  salePrice: number | null; // cents; null for legacy sales logged before this field existed
  profit: number; // cents
  notes: string | null;
}

export interface LotRow {
  id: string;
  name: string;
  source: string | null;
  purchaseDate: string;
  totalCards: number;
  totalCost: number; // cents
  costPerCard: number; // cents
  notes: string | null;
  soldCount: number;
  remaining: number;
  realizedProfit: number; // cents
  roi: number | null;
  estValue: number | null; // cents, estimated value of the remaining cards
  remainingCostValue: number; // cents, cost basis of the remaining cards
  unrealizedProfit: number | null; // estValue - remainingCostValue, null until estValue is set
  sales: LotSaleRow[];
}

export function toLotRow(
  lot: LotLike & {
    name: string;
    source: string | null;
    purchaseDate: Date | string;
    notes: string | null;
  },
  sales: (LotSaleLike & { saleDate: Date | string; salePrice: number | null; notes: string | null })[]
): LotRow {
  const lotSales = sales.filter((s) => s.lotId === lot.id);

  return {
    id: lot.id,
    name: lot.name,
    source: lot.source,
    purchaseDate: new Date(lot.purchaseDate).toISOString(),
    totalCards: lot.totalCards,
    totalCost: lot.totalCost,
    costPerCard: lotCostPerCard(lot),
    notes: lot.notes,
    soldCount: lotSoldCount(lot, sales),
    remaining: lotRemainingCards(lot, sales),
    realizedProfit: lotRealizedProfit(lot, sales),
    roi: lotROI(lot, sales),
    estValue: lot.estValue ?? null,
    remainingCostValue: lotRemainingCostValue(lot, sales),
    unrealizedProfit: lotUnrealizedProfit(lot, sales),
    sales: [...lotSales]
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
      .map((s) => ({
        id: s.id,
        saleDate: new Date(s.saleDate).toISOString(),
        quantity: s.quantity,
        salePrice: s.salePrice,
        profit: s.profit,
        notes: s.notes,
      })),
  };
}
