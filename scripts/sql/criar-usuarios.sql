-- Script SQL para criar usuários manualmente
-- Execute: psql -U lucaslima -d erp_espaco_mulher -f criar-usuarios.sql

-- NOTA: As senhas precisam ser hasheadas com bcrypt
-- Este script cria os usuários, mas você precisará usar o script Node.js para hash das senhas

-- Primeiro, verifique se a tabela users existe
SELECT * FROM users LIMIT 1;

-- Se a tabela estiver vazia, você precisa executar o seed do Prisma
-- Execute no terminal: npm run db:seed
