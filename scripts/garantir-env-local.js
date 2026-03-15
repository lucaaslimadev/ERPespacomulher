#!/usr/bin/env node
/**
 * Configura o .env para PostgreSQL local (porta 5432, sem Docker).
 * Uso comum: postgres/postgres ou seu_usuario_mac (sem senha)
 * Rode: node scripts/garantir-env-local.js
 */

const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env')
// No Mac com Homebrew, o usuário padrão é geralmente o usuário do sistema (sem senha)
const user = process.env.USER || 'postgres'
const content = `# Configurado para PostgreSQL local (sem Docker)
# Homebrew no Mac usa o usuário do sistema por padrão
DATABASE_URL="postgresql://${user}@localhost:5432/erp_espaco_mulher?schema=public"
JWT_SECRET="sua-chave-secreta-aqui"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
`

fs.writeFileSync(envPath, content, 'utf8')
console.log('>>> .env configurado para PostgreSQL local (postgres:postgres na porta 5432).')
console.log('>>> Se usar outro usuário, edite o .env e altere DATABASE_URL.')
console.log('>>> Depois: npx prisma migrate deploy && npm run db:seed && npm run dev')
process.exit(0)
