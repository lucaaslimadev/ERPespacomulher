-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CAIXA', 'GERENTE', 'ADMIN');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('DINHEIRO', 'PIX', 'CREDITO', 'DEBITO', 'MISTO');

-- CreateEnum
CREATE TYPE "StockType" AS ENUM ('ENTRADA_COMPRA', 'ENTRADA_AJUSTE', 'ENTRADA_DEVOLUCAO', 'SAIDA_VENDA', 'SAIDA_AJUSTE', 'SAIDA_PERDA');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTUAL', 'VALOR_FIXO');

-- CreateEnum
CREATE TYPE "FinancialType" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CAIXA',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL,
    "barcode" TEXT,
    "sku" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lowStockAlert" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variations" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "userId" TEXT NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_logs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "StockType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_logs" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "discountType" "DiscountType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancellation_logs" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cancellation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transactions" (
    "id" TEXT NOT NULL,
    "type" "FinancialType" NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_variations_productId_color_size_key" ON "product_variations"("productId", "color", "size");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variations" ADD CONSTRAINT "product_variations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "product_variations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_logs" ADD CONSTRAINT "stock_logs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_logs" ADD CONSTRAINT "stock_logs_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "product_variations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_logs" ADD CONSTRAINT "stock_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_logs" ADD CONSTRAINT "discount_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellation_logs" ADD CONSTRAINT "cancellation_logs_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellation_logs" ADD CONSTRAINT "cancellation_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
