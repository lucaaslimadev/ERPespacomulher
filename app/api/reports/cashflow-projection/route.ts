import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { UserRole } from '@/lib/auth'
import { prisma } from '@/lib/db'

function parseHorizon(req: NextRequest): number {
  const { searchParams } = new URL(req.url)
  const horizon = Number(searchParams.get('horizon') || '30')
  if (horizon === 60 || horizon === 90) return horizon
  return 30
}

async function getCashflowProjection(req: NextRequest) {
  try {
    const horizon = parseHorizon(req)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const horizonDate = new Date(today)
    horizonDate.setDate(horizonDate.getDate() + horizon)

    const [payables, receivables, fixedExpenses, recentSales] = await Promise.all([
      prisma.accountsPayable.findMany({
        where: { paid: false, dueDate: { gte: today, lte: horizonDate } },
        select: { id: true, dueDate: true, amount: true, category: true },
      }),
      prisma.accountsReceivable.findMany({
        where: { received: false, dueDate: { gte: today, lte: horizonDate } },
        select: { id: true, dueDate: true, amount: true, receivedAmount: true, category: true },
      }),
      prisma.fixedExpense.findMany({
        where: { active: true },
        select: { id: true, description: true, dayOfMonth: true, amount: true, category: true },
      }),
      prisma.sale.findMany({
        where: {
          cancelled: false,
          createdAt: { gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), lte: today },
        },
        select: { total: true, createdAt: true },
      }),
    ])

    const receivablesOpen = receivables.map((r) => ({
      ...r,
      openAmount: Math.max(0, Number(r.amount) - Number(r.receivedAmount)),
    }))

    const totalProjectedReceiptsKnown = receivablesOpen.reduce((sum, r) => sum + r.openAmount, 0)
    const totalProjectedPayments = payables.reduce((sum, p) => sum + Number(p.amount), 0)

    const dailySalesAverage = recentSales.length > 0
      ? recentSales.reduce((sum, s) => sum + Number(s.total), 0) / 30
      : 0
    const salesForecast = dailySalesAverage * horizon

    let fixedExpenseForecast = 0
    const cursor = new Date(today)
    while (cursor <= horizonDate) {
      const day = cursor.getDate()
      fixedExpenseForecast += fixedExpenses
        .filter((f) => f.dayOfMonth === day)
        .reduce((sum, f) => sum + Number(f.amount), 0)
      cursor.setDate(cursor.getDate() + 1)
    }

    const projectedNet = totalProjectedReceiptsKnown + salesForecast - totalProjectedPayments - fixedExpenseForecast

    return NextResponse.json({
      horizonDays: horizon,
      range: { start: today, end: horizonDate },
      summary: {
        projectedReceiptsKnown: totalProjectedReceiptsKnown,
        projectedSalesForecast: salesForecast,
        projectedPayments: totalProjectedPayments,
        projectedFixedExpenses: fixedExpenseForecast,
        projectedNet,
      },
      details: {
        payablesCount: payables.length,
        receivablesCount: receivablesOpen.length,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao gerar fluxo projetado' }, { status: 500 })
  }
}

export const GET = withAuth(getCashflowProjection, UserRole.GERENTE)
