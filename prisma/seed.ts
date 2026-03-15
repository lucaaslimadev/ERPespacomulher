import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Criar categorias
  const categories = [
    { name: 'Blusas' },
    { name: 'Calças' },
    { name: 'Vestidos' },
    { name: 'Saias' },
    { name: 'Acessórios' },
  ]

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    })
  }

  console.log('✅ Categorias criadas')

  // Criar usuário admin
  const adminPassword = await hashPassword('admin123')
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      name: 'Administrador',
      password: adminPassword,
      role: 'ADMIN',
    },
  })

  console.log('✅ Usuário admin criado (login: admin, senha: admin123)')

  // Criar usuário caixa
  const cashierPassword = await hashPassword('caixa123')
  await prisma.user.upsert({
    where: { username: 'caixa' },
    update: {},
    create: {
      username: 'caixa',
      name: 'Caixa',
      password: cashierPassword,
      role: 'CAIXA',
    },
  })

  console.log('✅ Usuário caixa criado (login: caixa, senha: caixa123)')

  // Criar produto de exemplo (ignora erro se já existir)
  const blusaCategory = await prisma.category.findUnique({ where: { name: 'Blusas' } })
  if (blusaCategory) {
    try {
      const existing = await prisma.product.findFirst({ where: { barcode: '7891234567890' } })
      if (!existing) {
        await prisma.product.create({
          data: {
            name: 'Blusa Básica',
            description: 'Blusa básica de algodão',
            categoryId: blusaCategory.id,
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
      } else {
        console.log('✅ Produto de exemplo já existe')
      }
    } catch (e) {
      console.log('⚠️ Produto de exemplo já existe ou erro ao criar (ignorado)')
    }
  }

  console.log('🎉 Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
