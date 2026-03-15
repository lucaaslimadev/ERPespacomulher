-- CreateEnum
CREATE TYPE "CardFeeType" AS ENUM ('PERCENTUAL', 'VALOR_FIXO');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ACCOUNT_PAYABLE_DUE', 'ACCOUNT_PAYABLE_DUE_SOON', 'ACCOUNT_RECEIVABLE_DUE', 'ACCOUNT_RECEIVABLE_DUE_SOON', 'FIXED_EXPENSE_DUE', 'FIXED_EXPENSE_DUE_SOON', 'LOW_STOCK', 'SALE_CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentMethod" ADD VALUE 'CREDITO_AVISTA';
ALTER TYPE "PaymentMethod" ADD VALUE 'CREDITO_PARCELADO';

-- CreateTable
CREATE TABLE "sale_installments" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts_payable" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "supplier" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_payable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts_receivable" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "customerId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "received" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3),
    "receivedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_receivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_expenses" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" TEXT NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_fee_configs" (
    "id" TEXT NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "feeType" "CardFeeType" NOT NULL,
    "feeValue" DECIMAL(10,4) NOT NULL,
    "installments" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_fee_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "card_fee_configs_paymentMethod_installments_key" ON "card_fee_configs"("paymentMethod", "installments");

-- AddForeignKey
ALTER TABLE "sale_installments" ADD CONSTRAINT "sale_installments_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
