import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/db'

async function getDailySales(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Data inicial e final são obrigatórias' }, { status: 400 })
    }

    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    // Buscar todas as vendas no período
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        cancelled: false,
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
        paymentMethod: true,
      },
    })

    // Agrupar por dia
    const dailySales: Record<string, { date: string; total: number; count: number }> = {}

    sales.forEach((sale) => {
      const dateKey = sale.createdAt.toISOString().split('T')[0]
      if (!dailySales[dateKey]) {
        dailySales[dateKey] = {
          date: dateKey,
          total: 0,
          count: 0,
        }
      }
      dailySales[dateKey].total += parseFloat(sale.total.toString())
      dailySales[dateKey].count += 1
    })

    // Converter para array e ordenar por data
    const result = Object.values(dailySales).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    return NextResponse.json({ dailySales: result })
  } catch (error: any) {
    console.error('❌ Erro ao buscar vendas diárias:', error)
    return NextResponse.json({ 
      error: 'Erro ao buscar vendas diárias',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

export const GET = withAuth(getDailySales)
