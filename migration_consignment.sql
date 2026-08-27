-- Criar enum para status de consignado
CREATE TYPE "ConsignmentStatus" AS ENUM ('SENT', 'PARTIAL_RETURN', 'COMPLETED', 'CANCELLED');

-- Criar tabela de consignados
CREATE TABLE "consignments" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnDate" TIMESTAMP(3),
    "status" "ConsignmentStatus" NOT NULL DEFAULT 'SENT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consignments_pkey" PRIMARY KEY ("id")
);

-- Criar tabela de itens de consignado
CREATE TABLE "consignment_items" (
    "id" TEXT NOT NULL,
    "consignmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "returned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consignment_items_pkey" PRIMARY KEY ("id")
);

-- Adicionar chaves estrangeiras
ALTER TABLE "consignments" ADD CONSTRAINT "consignments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consignments" ADD CONSTRAINT "consignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "consignment_items" ADD CONSTRAINT "consignment_items_consignmentId_fkey" FOREIGN KEY ("consignmentId") REFERENCES "consignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consignment_items" ADD CONSTRAINT "consignment_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consignment_items" ADD CONSTRAINT "consignment_items_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "product_variations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
