-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "totalCards" INTEGER NOT NULL,
    "totalCost" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotSale" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lotId" TEXT NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "profit" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "LotSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lot_purchaseDate_idx" ON "Lot"("purchaseDate");

-- CreateIndex
CREATE INDEX "LotSale_lotId_idx" ON "LotSale"("lotId");

-- AddForeignKey
ALTER TABLE "LotSale" ADD CONSTRAINT "LotSale_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
