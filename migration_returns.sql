-- Criar tipos ENUM
CREATE TYPE "ReturnType" AS ENUM ('DEVOLUCAO', 'TROCA');
CREATE TYPE "ReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- Criar tabela de devoluções/trocas
CREATE TABLE "returns" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReturnType" NOT NULL,
    "reason" TEXT,
    "refundAmount" DECIMAL(10,2) NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "returns_pkey" PRIMARY KEY ("id")
);

-- Criar tabela de itens devolvidos
CREATE TABLE "return_items" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_items_pkey" PRIMARY KEY ("id")
);

-- Criar tabela de itens de troca
CREATE TABLE "exchange_items" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_items_pkey" PRIMARY KEY ("id")
);

-- Adicionar chaves estrangeiras
ALTER TABLE "returns" ADD CONSTRAINT "returns_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "returns" ADD CONSTRAINT "returns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "return_items" ADD CONSTRAINT "return_items_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "product_variations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "exchange_items" ADD CONSTRAINT "exchange_items_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exchange_items" ADD CONSTRAINT "exchange_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exchange_items" ADD CONSTRAINT "exchange_items_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "product_variations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
