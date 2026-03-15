-- AlterTable: accounts_receivable - vínculo com venda (cancelamento reverte parcelas)
ALTER TABLE "accounts_receivable" ADD COLUMN "saleId" TEXT;

-- AlterTable: financial_transactions - rastreabilidade pagamento/recebimento
ALTER TABLE "financial_transactions" ADD COLUMN "accountPayableId" TEXT;
ALTER TABLE "financial_transactions" ADD COLUMN "accountReceivableId" TEXT;

-- ForeignKey: accounts_receivable.saleId -> sales.id
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_saleId_fkey" 
  FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ForeignKey: financial_transactions.accountPayableId -> accounts_payable.id
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_accountPayableId_fkey" 
  FOREIGN KEY ("accountPayableId") REFERENCES "accounts_payable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ForeignKey: financial_transactions.accountReceivableId -> accounts_receivable.id
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_accountReceivableId_fkey" 
  FOREIGN KEY ("accountReceivableId") REFERENCES "accounts_receivable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
