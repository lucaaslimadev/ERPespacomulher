-- Ver o que há em accounts_receivable
SELECT id, description, category, amount, received, "createdAt"
FROM accounts_receivable
ORDER BY "createdAt" DESC
LIMIT 50;
