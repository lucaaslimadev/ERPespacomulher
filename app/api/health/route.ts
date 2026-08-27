import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Health check público - não requer autenticação.
 * Útil para verificar se a API está acessível (Docker, load balancer).
 */
export async function GET() {
  const startedAt = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      ok: true,
      service: 'erp-espaco-mulher',
      timestamp: new Date().toISOString(),
      dbLatencyMs: Date.now() - startedAt,
    })
  } catch (error: unknown) {
    const requestId = crypto.randomUUID()
    console.error(`[Health][${requestId}] Database unreachable`, error)
    return NextResponse.json(
      { ok: false, error: 'Database unreachable', requestId },
      { status: 503 }
    )
  }
}
