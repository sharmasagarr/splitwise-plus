/*
  Warnings:

  - Added the required column `direction` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "counterpartyUserId" TEXT,
ADD COLUMN     "direction" TEXT NOT NULL,
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "paymentMethodId" TEXT,
ADD COLUMN     "settlementId" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_counterpartyUserId_idx" ON "Transaction"("counterpartyUserId");

-- CreateIndex
CREATE INDEX "Transaction_expenseId_idx" ON "Transaction"("expenseId");

-- CreateIndex
CREATE INDEX "Transaction_settlementId_idx" ON "Transaction"("settlementId");

-- CreateIndex
CREATE INDEX "Transaction_groupId_idx" ON "Transaction"("groupId");

-- CreateIndex
CREATE INDEX "Transaction_userId_counterpartyUserId_idx" ON "Transaction"("userId", "counterpartyUserId");
