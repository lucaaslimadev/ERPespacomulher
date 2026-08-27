-- Apagar registros de vendas parceladas no cartão (categoria 'Venda Parcelada')
-- Primeiro verifica o que será apagado
SELECT id, LEFT(description, 50) as descricao, category, amount FROM accounts_receivable WHERE category NOT IN ('Crediário', 'Crediario');

-- Apaga os registros que NÃO são de crediário
-- DELETE FROM notifications WHERE "relatedId" IN (SELECT id FROM accounts_receivable WHERE category NOT IN ('Crediário', 'Crediario'));
-- DELETE FROM accounts_receivable WHERE category NOT IN ('Crediário', 'Crediario');
