// Script para criar categorias se não existirem
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('📦 Criando categorias...\n')

  const categories = [
    { name: 'Blusas' },
    { name: 'Calças' },
    { name: 'Vestidos' },
    { name: 'Saias' },
    { name: 'Acessórios' },
  ]

  for (const category of categories) {
    try {
      const existing = await prisma.category.findUnique({
        where: { name: category.name }
      })

      if (existing) {
        console.log(`⚠️  Categoria "${category.name}" já existe`)
      } else {
        await prisma.category.create({
          data: category
        })
        console.log(`✅ Categoria "${category.name}" criada`)
      }
    } catch (error) {
      console.error(`❌ Erro ao criar categoria "${category.name}":`, error.message)
    }
  }

  console.log('\n✅ Processo concluído!')
  
  // Listar todas as categorias
  const allCategories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { name: 'asc' }
  })
  
  console.log('\n📋 Categorias disponíveis:')
  allCategories.forEach(cat => {
    console.log(`   - ${cat.name}`)
  })
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
