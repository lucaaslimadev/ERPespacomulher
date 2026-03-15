const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🔐 Criando usuário admin...')

  // Criar ou atualizar admin (idempotente)
  const password = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      name: 'Administrador',
      password,
      role: 'ADMIN',
    },
  })

  console.log('✅ Usuário admin criado/atualizado com sucesso!')
  console.log('   Login: admin')
  console.log('   Senha: admin123')
  console.log('')
  console.log('Agora você pode fazer login!')
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
