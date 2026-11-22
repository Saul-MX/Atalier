-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "model" TEXT;

-- CreateIndex
CREATE INDEX "Product_model_idx" ON "Product"("model");
