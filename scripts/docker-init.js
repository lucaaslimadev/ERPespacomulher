/**
 * Script de inicialização para Docker - cria admin, categorias e dados básicos.
 * Usa variáveis de ambiente ADMIN_EMAIL (login) e ADMIN_PASSWORD.
 * Idempotente: pode ser executado várias vezes sem duplicar dados.
 */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const ADMIN_USERNAME = (process.env.ADMIN_EMAIL || process.env.ADMIN_USERNAME || 'admin').trim()
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || 'admin123').trim()

async function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

async function main() {
  console.log('🚀 Inicializando banco de dados (Docker)...')

  // 1. Categorias
  const categories = [
    { name: 'Blusas' },
    { name: 'Calças' },
    { name: 'Vestidos' },
    { name: 'Saias' },
    { name: 'Acessórios' },
  ]
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    })
  }
  console.log('✅ Categorias criadas')

  // 2. Usuário ADMIN (usa ADMIN_EMAIL/ADMIN_PASSWORD do ambiente)
  const adminPassword = await hashPassword(ADMIN_PASSWORD)
  await prisma.user.upsert({
    where: { username: ADMIN_USERNAME },
    update: {},
    create: {
      username: ADMIN_USERNAME,
      name: 'Administrador',
      password: adminPassword,
      role: 'ADMIN',
    },
  })
  console.log(`✅ Usuário admin criado (login: ${ADMIN_USERNAME})`)

  // 3. Usuário caixa
  const caixaPassword = await hashPassword('caixa123')
  await prisma.user.upsert({
    where: { username: 'caixa' },
    update: {},
    create: {
      username: 'caixa',
      name: 'Caixa',
      password: caixaPassword,
      role: 'CAIXA',
    },
  })
  console.log('✅ Usuário caixa criado (login: caixa, senha: caixa123)')

  // 4. Produto de exemplo (opcional)
  const blusa = await prisma.category.findUnique({ where: { name: 'Blusas' } })
  if (blusa) {
    const existing = await prisma.product.findFirst({ where: { barcode: '7891234567890' } })
    if (!existing) {
      await prisma.product.create({
        data: {
          name: 'Blusa Básica',
          description: 'Blusa básica de algodão',
          categoryId: blusa.id,
          price: '49.90',
          cost: '25.00',
          barcode: '7891234567890',
          sku: 'BLU-001',
          lowStockAlert: 5,
          variations: {
            create: [
              { color: 'Branco', size: 'P', quantity: 10 },
              { color: 'Branco', size: 'M', quantity: 15 },
              { color: 'Branco', size: 'G', quantity: 8 },
              { color: 'Preto', size: 'P', quantity: 12 },
              { color: 'Preto', size: 'M', quantity: 20 },
              { color: 'Preto', size: 'G', quantity: 5 },
            ],
          },
        },
      })
      console.log('✅ Produto de exemplo criado')
    }
  }

  console.log(`🎉 Inicialização concluída! Acesse com ${ADMIN_USERNAME} / [sua senha]`)
}

main()
  .catch((e) => {
    console.error('❌ Erro na inicialização:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
