-- Adicionar campo barcode nas variações de produto
ALTER TABLE "product_variations" ADD COLUMN "barcode" TEXT;

-- Criar índice único para barcode (permitindo NULL)
CREATE UNIQUE INDEX "product_variations_barcode_key" ON "product_variations"("barcode") WHERE "barcode" IS NOT NULL;
