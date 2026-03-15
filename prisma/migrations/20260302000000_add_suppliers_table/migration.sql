-- CreateTable: fornecedores
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "cnpj" TEXT,
    "address" TEXT,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- AddColumn: supplierId em accounts_payable
ALTER TABLE "accounts_payable" ADD COLUMN IF NOT EXISTS "supplierId" TEXT;

-- AddForeignKey (evita erro se já existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'accounts_payable_supplierId_fkey'
  ) THEN
    ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_supplierId_fkey"
      FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
