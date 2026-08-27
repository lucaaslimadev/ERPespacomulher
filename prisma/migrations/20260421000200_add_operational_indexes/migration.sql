-- Indices para consultas operacionais mais frequentes.

CREATE INDEX IF NOT EXISTS "sales_createdAt_cancelled_idx"
ON "sales"("createdAt", "cancelled");

CREATE INDEX IF NOT EXISTS "sale_items_saleId_idx"
ON "sale_items"("saleId");

CREATE INDEX IF NOT EXISTS "sale_items_variationId_idx"
ON "sale_items"("variationId");

CREATE INDEX IF NOT EXISTS "stock_logs_variationId_createdAt_idx"
ON "stock_logs"("variationId", "createdAt");

CREATE INDEX IF NOT EXISTS "stock_logs_productId_createdAt_idx"
ON "stock_logs"("productId", "createdAt");

CREATE INDEX IF NOT EXISTS "financial_transactions_date_type_idx"
ON "financial_transactions"("date", "type");

CREATE INDEX IF NOT EXISTS "financial_transactions_accountPayableId_idx"
ON "financial_transactions"("accountPayableId");

CREATE INDEX IF NOT EXISTS "financial_transactions_accountReceivableId_idx"
ON "financial_transactions"("accountReceivableId");

CREATE INDEX IF NOT EXISTS "accounts_payable_dueDate_paid_idx"
ON "accounts_payable"("dueDate", "paid");

CREATE INDEX IF NOT EXISTS "accounts_payable_supplierId_idx"
ON "accounts_payable"("supplierId");

CREATE INDEX IF NOT EXISTS "accounts_receivable_dueDate_received_idx"
ON "accounts_receivable"("dueDate", "received");

CREATE INDEX IF NOT EXISTS "accounts_receivable_customerId_idx"
ON "accounts_receivable"("customerId");

CREATE INDEX IF NOT EXISTS "accounts_receivable_saleId_idx"
ON "accounts_receivable"("saleId");

CREATE INDEX IF NOT EXISTS "notifications_read_createdAt_idx"
ON "notifications"("read", "createdAt");

CREATE INDEX IF NOT EXISTS "notifications_type_createdAt_idx"
ON "notifications"("type", "createdAt");

CREATE INDEX IF NOT EXISTS "returns_saleId_idx"
ON "returns"("saleId");

CREATE INDEX IF NOT EXISTS "returns_status_createdAt_idx"
ON "returns"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "consignments_status_createdAt_idx"
ON "consignments"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "consignments_customerId_idx"
ON "consignments"("customerId");
