-- Apagar notificações relacionadas aos registros que serão deletados
DELETE FROM notifications 
WHERE "relatedId" IN (
  SELECT id FROM accounts_receivable 
  WHERE category NOT IN ('Crediário', 'Crediario')
);

-- Apagar registros de contas a receber que NÃO são de crediário (ex: Venda Parcelada no cartão)
DELETE FROM accounts_receivable 
WHERE category NOT IN ('Crediário', 'Crediario');

-- Confirmar o que ficou
SELECT id, LEFT(description, 50) as descricao, category, amount, received FROM accounts_receivable;
