import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { UserRole } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { StockType } from '@prisma/client'

function parseDateRange(req: NextRequest): { start: Date; end: Date } {
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const today = new Date()
  const start = startDate ? new Date(startDate) : new Date(today.getFullYear(), today.getMonth(), 1)
  const end = endDate ? new Date(endDate) : new Date()
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

async function getLossAudit(req: NextRequest) {
  try {
    const { start, end } = parseDateRange(req)

    const [logs, returnsCount, cancellationsCount] = await Promise.all([
      prisma.stockLog.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          type: {
            in: [StockType.SAIDA_PERDA, StockType.SAIDA_AJUSTE, StockType.ENTRADA_DEVOLUCAO],
          },
        },
        include: {
          product: { select: { id: true, name: true, cost: true } },
          variation: { select: { id: true, color: true, size: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.return.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      prisma.cancellationLog.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
    ])

    const normalized = logs.map((log) => {
      const unitCost = Number(log.product.cost)
      const impact = (log.type === StockType.ENTRADA_DEVOLUCAO ? 1 : -1) * log.quantity * unitCost
      const standardizedReason = log.reason?.startsWith('PERDA:')
        ? log.reason.split('PERDA:')[1]?.split(' - ')[0] || 'OUTROS'
        : null
      return {
        id: log.id,
        type: log.type,
        createdAt: log.createdAt,
        reason: log.reason || 'Sem motivo informado',
        standardizedReason,
        quantity: log.quantity,
        estimatedImpact: impact,
        product: {
          id: log.product.id,
          name: log.product.name,
          variation: `${log.variation.color}/${log.variation.size}`,
        },
        user: log.user.name,
      }
    })

    const lossOnly = normalized.filter((n) => n.type !== StockType.ENTRADA_DEVOLUCAO)
    const estimatedTotalLoss = lossOnly.reduce((sum, n) => sum + Math.abs(n.estimatedImpact), 0)

    const byReason = lossOnly.reduce<Record<string, { count: number; impact: number }>>((acc, row) => {
      const key = row.reason
      if (!acc[key]) acc[key] = { count: 0, impact: 0 }
      acc[key].count += 1
      acc[key].impact += Math.abs(row.estimatedImpact)
      return acc
    }, {})

    return NextResponse.json({
      period: { start, end },
      summary: {
        totalMovements: normalized.length,
        lossMovements: lossOnly.length,
        estimatedTotalLoss,
        relatedReturns: returnsCount,
        relatedSaleCancellations: cancellationsCount,
      },
      byReason: Object.entries(byReason)
        .map(([reason, value]) => ({ reason, ...value }))
        .sort((a, b) => b.impact - a.impact),
      details: normalized,
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao gerar auditoria de perdas' }, { status: 500 })
  }
}

export const GET = withAuth(getLossAudit, UserRole.GERENTE)
