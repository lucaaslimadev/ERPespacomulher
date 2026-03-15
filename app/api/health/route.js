// pages/api/health.js (para Pages Router)
export default async function handler(req, res) {
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    // Testar conexão com banco
    await prisma.$queryRaw`SELECT 1`
    await prisma.$disconnect()
    
    res.status(200).json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    })
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message 
    })
  }
}