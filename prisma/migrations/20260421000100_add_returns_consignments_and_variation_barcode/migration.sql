-- Alinha schema atual com o banco em ambientes que ainda nao possuem devolucoes/consignados.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReturnType') THEN
    CREATE TYPE "ReturnType" AS ENUM ('DEVOLUCAO', 'TROCA');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReturnStatus') THEN
    CREATE TYPE "ReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConsignmentStatus') THEN
    CREATE TYPE "ConsignmentStatus" AS ENUM ('SENT', 'PARTIAL_RETURN', 'COMPLETED', 'CANCELLED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "returns" (
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

CREATE TABLE IF NOT EXISTS "return_items" (
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

CREATE TABLE IF NOT EXISTS "exchange_items" (
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

CREATE TABLE IF NOT EXISTS "consignments" (
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

CREATE TABLE IF NOT EXISTS "consignment_items" (
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

ALTER TABLE "product_variations"
ADD COLUMN IF NOT EXISTS "barcode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "product_variations_barcode_key"
ON "product_variations" ("barcode")
WHERE "barcode" IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'returns_saleId_fkey') THEN
    ALTER TABLE "returns"
    ADD CONSTRAINT "returns_saleId_fkey"
    FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'returns_userId_fkey') THEN
    ALTER TABLE "returns"
    ADD CONSTRAINT "returns_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'return_items_returnId_fkey') THEN
    ALTER TABLE "return_items"
    ADD CONSTRAINT "return_items_returnId_fkey"
    FOREIGN KEY ("returnId") REFERENCES "returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'return_items_productId_fkey') THEN
    ALTER TABLE "return_items"
    ADD CONSTRAINT "return_items_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'return_items_variationId_fkey') THEN
    ALTER TABLE "return_items"
    ADD CONSTRAINT "return_items_variationId_fkey"
    FOREIGN KEY ("variationId") REFERENCES "product_variations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exchange_items_returnId_fkey') THEN
    ALTER TABLE "exchange_items"
    ADD CONSTRAINT "exchange_items_returnId_fkey"
    FOREIGN KEY ("returnId") REFERENCES "returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exchange_items_productId_fkey') THEN
    ALTER TABLE "exchange_items"
    ADD CONSTRAINT "exchange_items_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exchange_items_variationId_fkey') THEN
    ALTER TABLE "exchange_items"
    ADD CONSTRAINT "exchange_items_variationId_fkey"
    FOREIGN KEY ("variationId") REFERENCES "product_variations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consignments_customerId_fkey') THEN
    ALTER TABLE "consignments"
    ADD CONSTRAINT "consignments_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consignments_userId_fkey') THEN
    ALTER TABLE "consignments"
    ADD CONSTRAINT "consignments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consignment_items_consignmentId_fkey') THEN
    ALTER TABLE "consignment_items"
    ADD CONSTRAINT "consignment_items_consignmentId_fkey"
    FOREIGN KEY ("consignmentId") REFERENCES "consignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consignment_items_productId_fkey') THEN
    ALTER TABLE "consignment_items"
    ADD CONSTRAINT "consignment_items_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consignment_items_variationId_fkey') THEN
    ALTER TABLE "consignment_items"
    ADD CONSTRAINT "consignment_items_variationId_fkey"
    FOREIGN KEY ("variationId") REFERENCES "product_variations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
