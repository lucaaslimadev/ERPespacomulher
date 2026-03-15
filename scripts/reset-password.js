/**
 * Redefinir senha de um usuário pelo terminal (quando perdeu a senha).
 * Uso: node scripts/reset-password.js <email> <nova_senha>
 * Exemplo: node scripts/reset-password.js admin@erp.com MinhaSenha123
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  const newPassword = process.argv[3]

  if (!email || !newPassword) {
    console.log('Uso: node scripts/reset-password.js <email> <nova_senha>')
    console.log('Exemplo: node scripts/reset-password.js admin@erp.com MinhaSenha123')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    console.error('❌ Usuário não encontrado com o email:', email)
    process.exit(1)
  }

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  })

  console.log('✅ Senha alterada com sucesso para:', email)
  console.log('   Faça login com a nova senha.')
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
