// Script para testar se o usuário existe e a senha está correta
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function testLogin() {
  console.log('🔍 Testando login...\n')

  const email = 'admin@erp.com'
  const password = 'admin123'

  try {
    // Verificar se usuário existe
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      console.log('❌ Usuário não encontrado!')
      console.log('   Execute: npm run db:create-admin')
      return
    }

    console.log('✅ Usuário encontrado:')
    console.log(`   Email: ${user.email}`)
    console.log(`   Nome: ${user.name}`)
    console.log(`   Role: ${user.role}`)
    console.log(`   Ativo: ${user.active}`)
    console.log(`   Senha hash: ${user.password.substring(0, 20)}...`)
    console.log('')

    // Testar senha
    const isValid = await bcrypt.compare(password, user.password)
    
    if (isValid) {
      console.log('✅ Senha está correta!')
      console.log('')
      console.log('O login deve funcionar. Se não funcionar, verifique:')
      console.log('  1. Se o servidor está rodando (npm run dev)')
      console.log('  2. Console do navegador para erros')
      console.log('  3. Logs do servidor no terminal')
    } else {
      console.log('❌ Senha está incorreta!')
      console.log('   A senha no banco não corresponde a "admin123"')
      console.log('   Execute: npm run db:create-admin para recriar')
    }

  } catch (error) {
    console.error('❌ Erro:', error.message)
    console.log('')
    console.log('Verifique se:')
    console.log('  1. O banco de dados está rodando')
    console.log('  2. O arquivo .env está configurado')
    console.log('  3. As migrações foram executadas (npm run db:migrate)')
  } finally {
    await prisma.$disconnect()
  }
}

testLogin()
