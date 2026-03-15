import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Endpoint de diagnóstico - NÃO usar em produção com dados sensíveis.
 * Retorna contagens básicas para verificar se o banco está gravando.
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_DB_DEBUG) {
    return NextResponse.json({ error: 'Desabilitado em produção' }, { status: 404 })
  }
  try {
    const [users, suppliers, categories, products] = await Promise.all([
      prisma.user.count(),
      prisma.supplier.count(),
      prisma.category.count(),
      prisma.product.count(),
    ])
    return NextResponse.json({
      ok: true,
      counts: { users, suppliers, categories, products },
      databaseUrl: process.env.DATABASE_URL ? 'definida' : 'não definida',
    })
  } catch (error) {
    console.error('[debug/db]', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
