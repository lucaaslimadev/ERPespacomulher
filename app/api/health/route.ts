import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Health check público - não requer autenticação.
 * Útil para verificar se a API está acessível (Docker, load balancer).
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      ok: true,
      env: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Health check DB failed:', error)
    return NextResponse.json(
      { ok: false, error: 'Database unreachable' },
      { status: 503 }
    )
  }
}
