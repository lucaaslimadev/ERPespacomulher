-- Script para criar a tabela sale_payments manualmente
-- Execute este script no PostgreSQL se a migração não funcionar

CREATE TABLE IF NOT EXISTS "sale_payments" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "amount" DECIMAL(10, 2) NOT NULL,
    "installments" INTEGER,
    "cardFee" DECIMAL(10, 2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id")
);

-- Adicionar foreign key
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'sale_payments_saleId_fkey'
    ) THEN
        ALTER TABLE "sale_payments" 
        ADD CONSTRAINT "sale_payments_saleId_fkey" 
        FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS "sale_payments_saleId_idx" ON "sale_payments"("saleId");
