import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { UserRole } from '@/lib/auth'
import { prisma } from '@/lib/db'

type DreRegime = 'caixa' | 'competencia'

function parseDateRange(req: NextRequest): { start: Date; end: Date; regime: DreRegime } {
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const regime = (searchParams.get('regime') || 'competencia').toLowerCase() as DreRegime

  const today = new Date()
  const start = startDate ? new Date(startDate) : new Date(today.getFullYear(), today.getMonth(), 1)
  const end = endDate ? new Date(endDate) : new Date(today.getFullYear(), today.getMonth() + 1, 0)
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)

  return {
    start,
    end,
    regime: regime === 'caixa' ? 'caixa' : 'competencia',
  }
}

async function getDre(req: NextRequest) {
  try {
    const { start, end, regime } = parseDateRange(req)

    const sales = await prisma.sale.findMany({
      where: {
        cancelled: false,
        createdAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        subtotal: true,
        discount: true,
        total: true,
      },
    })

    const saleIds = sales.map((s) => s.id)
    const saleItems = saleIds.length > 0
      ? await prisma.saleItem.findMany({
          where: { saleId: { in: saleIds } },
          include: {
            product: {
              select: { cost: true },
            },
          },
        })
      : []

    const revenueGross = sales.reduce((sum, s) => sum + Number(s.subtotal), 0)
    const discounts = sales.reduce((sum, s) => sum + Number(s.discount), 0)
    const revenueNet = sales.reduce((sum, s) => sum + Number(s.total), 0)
    const cmv = saleItems.reduce((sum, item) => {
      const itemCost = Number(item.product.cost)
      return sum + itemCost * item.quantity
    }, 0)

    const payable = await prisma.accountsPayable.findMany({
      where: {
        dueDate: { gte: start, lte: end },
      },
      select: {
        amount: true,
        category: true,
        paid: true,
        paidAmount: true,
      },
    })

    const variableExpenses = payable
      .filter((p) => !/aluguel|salario|internet|energia|agua|fix/i.test(p.category))
      .reduce((sum, p) => sum + Number(p.paid ? p.paidAmount : p.amount), 0)

    const fixedExpenses = payable
      .filter((p) => /aluguel|salario|internet|energia|agua|fix/i.test(p.category))
      .reduce((sum, p) => sum + Number(p.paid ? p.paidAmount : p.amount), 0)

    const cashEntries = await prisma.financialTransaction.aggregate({
      where: {
        date: { gte: start, lte: end },
        type: 'ENTRADA',
      },
      _sum: { amount: true },
    })
    const cashOutputs = await prisma.financialTransaction.aggregate({
      where: {
        date: { gte: start, lte: end },
        type: 'SAIDA',
      },
      _sum: { amount: true },
    })

    const operationalResult = regime === 'caixa'
      ? Number(cashEntries._sum.amount || 0) - Number(cashOutputs._sum.amount || 0)
      : revenueNet - cmv - fixedExpenses - variableExpenses

    const netMargin = regime === 'caixa'
      ? (Number(cashEntries._sum.amount || 0) > 0
          ? (operationalResult / Number(cashEntries._sum.amount || 0)) * 100
          : 0)
      : (revenueNet > 0 ? (operationalResult / revenueNet) * 100 : 0)

    return NextResponse.json({
      regime,
      period: { start, end },
      summary: {
        revenueGross,
        discounts,
        revenueNet,
        cmv,
        fixedExpenses,
        variableExpenses,
        operationalResult,
        netMargin,
      },
      cash: {
        entries: Number(cashEntries._sum.amount || 0),
        outputs: Number(cashOutputs._sum.amount || 0),
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao gerar DRE' }, { status: 500 })
  }
}

export const GET = withAuth(getDre, UserRole.GERENTE)
