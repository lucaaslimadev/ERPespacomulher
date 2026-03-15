#!/usr/bin/env node
/**
 * Cria/atualiza o .env para usar o Postgres do Docker (erp / erp_senha_segura).
 * Rode: node scripts/garantir-env-docker-db.js
 * Depois: npx prisma migrate deploy && npm run db:seed && npm run dev
 */

const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env')
const content = `# Gerado/atualizado por scripts/garantir-env-docker-db.js — banco no Docker
DATABASE_URL="postgresql://erp:erp_senha_segura@localhost:5433/erp_espaco_mulher?schema=public"
JWT_SECRET="sua-chave-secreta-aqui"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
`

fs.writeFileSync(envPath, content, 'utf8')
console.log('>>> .env atualizado com credenciais do Postgres no Docker (erp / erp_senha_segura).')
console.log('>>> Agora rode: npx prisma migrate deploy && npm run db:seed && npm run dev')
console.log('>>> Acesse http://localhost:3000 e faça login com admin / admin123')
process.exit(0)
