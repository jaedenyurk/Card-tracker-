-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('HELD', 'SOLD');

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "player" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "year" TEXT,
    "setName" TEXT,
    "cardNumber" TEXT,
    "parallel" TEXT,
    "gradingCo" TEXT,
    "grade" TEXT,
    "imageUrl" TEXT,
    "notes" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "purchasePrice" INTEGER NOT NULL,
    "purchasePlatform" TEXT,
    "status" "CardStatus" NOT NULL DEFAULT 'HELD',
    "soldDate" TIMESTAMP(3),
    "soldPrice" INTEGER,
    "soldPlatform" TEXT,
    "marketValue" INTEGER,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "cardId" TEXT,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Card_status_idx" ON "Card"("status");

-- CreateIndex
CREATE INDEX "Card_sport_idx" ON "Card"("sport");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Expense_cardId_idx" ON "Expense"("cardId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;
