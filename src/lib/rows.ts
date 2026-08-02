import { cardCostBasis, cardProfit, cardROI } from "./calculations";
import type { CardLike, ExpenseLike } from "./types";

export interface CardRow {
  id: string;
  player: string;
  sport: string;
  year: string | null;
  gradingLabel: string; // e.g. "PSA 10" or "Raw"
  status: "HELD" | "SOLD";
  purchasePrice: number;
  costBasis: number;
  currentValue: number | null; // soldPrice, marketValue, or null if held w/o estimate
  profit: number | null;
  roi: number | null;
  purchaseDate: string;
  soldDate: string | null;
}

function gradingLabel(card: { gradingCo: string | null; grade: string | null }): string {
  if (!card.gradingCo) return "Raw";
  return card.grade ? `${card.gradingCo} ${card.grade}` : card.gradingCo;
}

export function toCardRow(
  card: CardLike & {
    player: string;
    sport: string;
    year: string | null;
    gradingCo: string | null;
    grade: string | null;
  },
  expenses: ExpenseLike[]
): CardRow {
  const currentValue =
    card.status === "SOLD" ? card.soldPrice : card.marketValue ?? null;

  return {
    id: card.id,
    player: card.player,
    sport: card.sport,
    year: card.year,
    gradingLabel: gradingLabel(card),
    status: card.status,
    purchasePrice: card.purchasePrice,
    costBasis: cardCostBasis(card, expenses),
    currentValue,
    profit: cardProfit(card, expenses),
    roi: cardROI(card, expenses),
    purchaseDate: new Date(card.purchaseDate).toISOString(),
    soldDate: card.soldDate ? new Date(card.soldDate).toISOString() : null,
  };
}
