// Script para testar se consegue acessar o dashboard
const { PrismaClient } = require('@prisma/client')
const { verifyToken, generateToken } = require('./lib/auth')

const prisma = new PrismaClient()

async function testDashboard() {
  console.log('🔍 Testando acesso ao dashboard...\n')

  try {
    // Buscar usuário admin
    const user = await prisma.user.findUnique({
      where: { email: 'admin@erp.com' }
    })

    if (!user) {
      console.log('❌ Usuário não encontrado')
      console.log('   Execute: npm run db:create-admin')
      return
    }

    console.log('✅ Usuário encontrado:', user.email)
    console.log('✅ Usuário ativo:', user.active)
    console.log('')

    // Gerar token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    console.log('✅ Token gerado')
    console.log('')
    console.log('📋 Para testar o dashboard:')
    console.log('')
    console.log('1. Abra o console do navegador (F12)')
    console.log('2. Execute este comando:')
    console.log('')
    console.log(`   document.cookie = "token=${token}; path=/; max-age=${60*60*24*7}"`)
    console.log('')
    console.log('3. Acesse: http://localhost:3000/dashboard')
    console.log('')
    console.log('Ou execute no console:')
    console.log('')
    console.log(`   fetch('/api/auth/login', {`)
    console.log(`     method: 'POST',`)
    console.log(`     headers: { 'Content-Type': 'application/json' },`)
    console.log(`     credentials: 'include',`)
    console.log(`     body: JSON.stringify({ email: 'admin@erp.com', password: 'admin123' })`)
    console.log(`   }).then(r => r.json()).then(d => {`)
    console.log(`     if(d.user) window.location.href = '/dashboard'`)
    console.log(`   })`)

  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testDashboard()
