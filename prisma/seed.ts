import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// All money in cents.
async function main() {
  const existing = await prisma.card.count();
  if (existing > 0) {
    console.log(`Database already has ${existing} card(s) — skipping seed.`);
    return;
  }

  console.log("Seeding sample data...");

  const cards = [
    {
      player: "Victor Wembanyama",
      sport: "Basketball",
      year: "2023",
      setName: "Prizm",
      cardNumber: "RC-1",
      parallel: "Silver",
      gradingCo: "PSA",
      grade: "10",
      purchaseDate: "2024-11-05",
      purchasePrice: 45000,
      purchasePlatform: "eBay",
      status: "SOLD" as const,
      soldDate: "2025-03-12",
      soldPrice: 72000,
      soldPlatform: "eBay",
      gradingExpense: 6000,
    },
    {
      player: "Caitlin Clark",
      sport: "Basketball",
      year: "2024",
      setName: "Prizm WNBA",
      cardNumber: "RC-22",
      parallel: "Base",
      gradingCo: "PSA",
      grade: "9",
      purchaseDate: "2024-05-20",
      purchasePrice: 15000,
      purchasePlatform: "COMC",
      status: "SOLD" as const,
      soldDate: "2024-08-01",
      soldPrice: 21000,
      soldPlatform: "eBay",
      gradingExpense: 3000,
    },
    {
      player: "Shohei Ohtani",
      sport: "Baseball",
      year: "2018",
      setName: "Topps Chrome",
      cardNumber: "150",
      parallel: "Refractor",
      gradingCo: "BGS",
      grade: "9.5",
      purchaseDate: "2023-02-14",
      purchasePrice: 30000,
      purchasePlatform: "Local Show",
      status: "SOLD" as const,
      soldDate: "2025-01-22",
      soldPrice: 26000, // sold at a loss
      soldPlatform: "PWCC",
      gradingExpense: 0,
    },
    {
      player: "Bijan Robinson",
      sport: "Football",
      year: "2023",
      setName: "Panini Prizm",
      cardNumber: "RC-8",
      parallel: "Base",
      gradingCo: null,
      grade: null,
      purchaseDate: "2024-01-10",
      purchasePrice: 8000,
      purchasePlatform: "eBay",
      status: "SOLD" as const,
      soldDate: "2024-06-15",
      soldPrice: 11500,
      soldPlatform: "eBay",
      gradingExpense: 0,
    },
    {
      player: "Connor Bedard",
      sport: "Hockey",
      year: "2023",
      setName: "Upper Deck Young Guns",
      cardNumber: "YG-201",
      parallel: "Base",
      gradingCo: "PSA",
      grade: "10",
      purchaseDate: "2024-09-01",
      purchasePrice: 22000,
      purchasePlatform: "eBay",
      status: "HELD" as const,
      marketValue: 31000,
      gradingExpense: 5500,
    },
    {
      player: "Anthony Edwards",
      sport: "Basketball",
      year: "2020",
      setName: "Prizm",
      cardNumber: "RC-258",
      parallel: "Silver",
      gradingCo: "PSA",
      grade: "9",
      purchaseDate: "2025-02-01",
      purchasePrice: 12000,
      purchasePlatform: "eBay",
      status: "HELD" as const,
      marketValue: 16000,
      gradingExpense: 0,
    },
    {
      player: "Jayden Daniels",
      sport: "Football",
      year: "2024",
      setName: "Panini Select",
      cardNumber: "RC-15",
      parallel: "Concourse",
      gradingCo: null,
      grade: null,
      purchaseDate: "2025-05-18",
      purchasePrice: 9500,
      purchasePlatform: "Whatnot",
      status: "HELD" as const,
      marketValue: null, // no estimate yet
      gradingExpense: 0,
    },
    {
      player: "Paul Skenes",
      sport: "Baseball",
      year: "2024",
      setName: "Bowman Chrome",
      cardNumber: "BC-1",
      parallel: "Refractor",
      gradingCo: "PSA",
      grade: "10",
      purchaseDate: "2025-06-02",
      purchasePrice: 35000,
      purchasePlatform: "eBay",
      status: "HELD" as const,
      marketValue: 42000,
      gradingExpense: 7000,
    },
  ];

  for (const c of cards) {
    const { gradingExpense, ...cardData } = c;
    const created = await prisma.card.create({
      data: {
        player: cardData.player,
        sport: cardData.sport,
        year: cardData.year,
        setName: cardData.setName,
        cardNumber: cardData.cardNumber,
        parallel: cardData.parallel,
        gradingCo: cardData.gradingCo,
        grade: cardData.grade,
        purchaseDate: new Date(cardData.purchaseDate),
        purchasePrice: cardData.purchasePrice,
        purchasePlatform: cardData.purchasePlatform,
        status: cardData.status,
        soldDate: "soldDate" in cardData && cardData.soldDate ? new Date(cardData.soldDate) : null,
        soldPrice: "soldPrice" in cardData ? cardData.soldPrice : null,
        soldPlatform: "soldPlatform" in cardData ? cardData.soldPlatform : null,
        marketValue: "marketValue" in cardData ? cardData.marketValue : null,
      },
    });

    if (gradingExpense > 0) {
      await prisma.expense.create({
        data: {
          date: new Date(cardData.purchaseDate),
          category: "Grading",
          description: `${cardData.gradingCo} grading submission`,
          amount: gradingExpense,
          cardId: created.id,
        },
      });
    }
  }

  const generalExpenses = [
    { date: "2024-01-15", category: "Software", description: "Card pricing app subscription (Jan)", amount: 2500 },
    { date: "2024-02-15", category: "Software", description: "Card pricing app subscription (Feb)", amount: 2500 },
    { date: "2024-03-01", category: "Supplies", description: "Penny sleeves & top loaders bulk order", amount: 4500 },
    { date: "2024-04-20", category: "Travel", description: "Local card show table fee", amount: 6000 },
    { date: "2024-06-10", category: "Shipping", description: "Shipping supplies (bubble mailers, tape)", amount: 3200 },
    { date: "2024-09-05", category: "Fees", description: "eBay store subscription", amount: 2999 },
    { date: "2025-01-10", category: "Supplies", description: "One-touch magnetic holders", amount: 5800 },
    { date: "2025-03-22", category: "Travel", description: "National card show — travel + table", amount: 45000 },
    { date: "2025-06-15", category: "Software", description: "Card pricing app subscription (annual renewal)", amount: 28000 },
  ];

  for (const e of generalExpenses) {
    await prisma.expense.create({
      data: {
        date: new Date(e.date),
        category: e.category,
        description: e.description,
        amount: e.amount,
        cardId: null,
      },
    });
  }

  console.log(`Seeded ${cards.length} cards and ${generalExpenses.length} general expenses.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
