-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "priceFrom" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Product_priceFrom_idx" ON "Product"("priceFrom");
