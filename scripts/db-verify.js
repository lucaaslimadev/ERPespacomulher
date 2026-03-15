#!/usr/bin/env node
/**
 * Verifica conexão e escrita no banco.
 * Uso: node scripts/db-verify.js
 * No Docker: docker compose exec app node scripts/db-verify.js
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'definida' : 'NÃO DEFINIDA')
  console.log('Testando conexão...')

  await prisma.$queryRaw`SELECT 1`
  console.log('✓ Conexão OK')

  const count = await prisma.supplier.count()
  console.log(`✓ Fornecedores no banco: ${count}`)

  const userCount = await prisma.user.count()
  console.log(`✓ Usuários no banco: ${userCount}`)

  console.log('Teste de escrita (rollback)...')
  await prisma.$transaction(async (tx) => {
    const created = await tx.supplier.create({
      data: {
        name: '_teste_db_verify_' + Date.now(),
        phone: null,
        email: null,
        cnpj: null,
        address: null,
        observations: null,
      },
    })
    await tx.supplier.delete({ where: { id: created.id } })
  })
  console.log('✓ Escrita OK (teste revertido)')

  console.log('\n🎉 Banco funcionando corretamente.')
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
