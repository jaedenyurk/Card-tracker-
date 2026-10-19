import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Each dashboard section loads independently (behind its own Suspense boundary) and asks for what it needs; React's cache() makes sure a table
// two sections both want is only queried once per request.
export const getCards = cache(() => prisma.card.findMany());
export const getExpenses = cache(() => prisma.expense.findMany());
export const getRevenue = cache(() => prisma.revenue.findMany());
export const getLots = cache(() => prisma.lot.findMany({ include: { sales: true } }));
