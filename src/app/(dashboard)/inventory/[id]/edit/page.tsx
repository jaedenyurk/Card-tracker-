import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CardForm, type CardFormValues } from "@/components/CardForm";

export const dynamic = "force-dynamic";

export default async function EditCardPage({ params }: { params: { id: string } }) {
  const card = await prisma.card.findUnique({ where: { id: params.id } });
  if (!card) notFound();

  const initial: CardFormValues = {
    player: card.player,
    sport: card.sport,
    year: card.year ?? "",
    setName: card.setName ?? "",
    cardNumber: card.cardNumber ?? "",
    parallel: card.parallel ?? "",
    gradingCo: card.gradingCo ?? "",
    grade: card.grade ?? "",
    purchaseDate: new Date(card.purchaseDate).toISOString().slice(0, 10),
    purchasePrice: (card.purchasePrice / 100).toString(),
    purchasePlatform: card.purchasePlatform ?? "",
    marketValue: card.marketValue != null ? (card.marketValue / 100).toString() : "",
    imageUrl: card.imageUrl ?? "",
    notes: card.notes ?? "",
  };

  return <CardForm mode="edit" cardId={card.id} initial={initial} />;
}
