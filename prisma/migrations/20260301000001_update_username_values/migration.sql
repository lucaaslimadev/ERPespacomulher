-- Atualiza usuários que tinham email como login para o novo formato (username)
-- Assim o login admin / admin123 passa a funcionar após a migração email -> username
UPDATE "users" SET "username" = 'admin' WHERE "username" = 'admin@erp.com';
UPDATE "users" SET "username" = 'gerente' WHERE "username" = 'gerente@erp.com';
UPDATE "users" SET "username" = 'caixa' WHERE "username" = 'caixa@erp.com';
