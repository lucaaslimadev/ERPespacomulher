import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { FinancialType } from '@prisma/client'

async function getDashboardStats(req: NextRequest) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)

    // Vendas do dia
    const MAX_SALES_STATS = 5000
    const todaySales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        cancelled: false,
      },
      take: MAX_SALES_STATS,
      include: { items: true },
    })

    const todayTotal = todaySales.reduce((sum, sale) => {
      return sum + parseFloat(sale.total.toString())
    }, 0)

    const todayCount = todaySales.length
    const todayTicket = todayCount > 0 ? todayTotal / todayCount : 0

    // Vendas de ontem (para comparação)
    const yesterdaySales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: yesterday, lt: today },
        cancelled: false,
      },
      take: MAX_SALES_STATS,
    })

    const yesterdayTotal = yesterdaySales.reduce((sum, sale) => {
      return sum + parseFloat(sale.total.toString())
    }, 0)

    // Vendas do mês
    const monthSales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: thisMonthStart },
        cancelled: false,
      },
      take: MAX_SALES_STATS,
    })

    const monthTotal = monthSales.reduce((sum, sale) => {
      return sum + parseFloat(sale.total.toString())
    }, 0)

    // Vendas do mês anterior
    const lastMonthSales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: lastMonthStart, lt: thisMonthStart },
        cancelled: false,
      },
      take: MAX_SALES_STATS,
    })

    const lastMonthTotal = lastMonthSales.reduce((sum, sale) => {
      return sum + parseFloat(sale.total.toString())
    }, 0)

    // Gráfico removido - substituído por painel de notificações

    // Produtos mais vendidos hoje
    const todayProducts = new Map<string, { name: string; quantity: number; revenue: number }>()
    
    // Primeiro, coletar todos os IDs de produtos
    const productIds = new Set<string>()
    todaySales.forEach(sale => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          if (item?.productId) {
            productIds.add(item.productId)
          }
        })
      }
    })

    // Buscar todos os produtos de uma vez (apenas se houver produtos)
    let productMap = new Map<string, string>()
    if (productIds.size > 0) {
      try {
        const products = await prisma.product.findMany({
          where: { id: { in: Array.from(productIds) } },
          select: { id: true, name: true },
        })
        productMap = new Map(products.map(p => [p.id, p.name]))
      } catch {
        // Ignorar falha ao montar mapa de produtos; totais ainda corretos
      }
    }

    // Agora processar as vendas
    todaySales.forEach(sale => {
      sale.items.forEach((item: any) => {
        const productId = item.productId
        const quantity = item.quantity
        const revenue = parseFloat(item.totalPrice.toString())

        if (todayProducts.has(productId)) {
          const existing = todayProducts.get(productId)!
          existing.quantity += quantity
          existing.revenue += revenue
        } else {
          todayProducts.set(productId, { 
            name: productMap.get(productId) || 'Produto', 
            quantity, 
            revenue 
          })
        }
      })
    })

    const topProductsToday = Array.from(todayProducts.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    // Estoque
    const totalProducts = await prisma.product.count({
      where: { active: true },
    })

    const lowStockProducts = await prisma.product.findMany({
      where: { active: true },
      include: {
        variations: true,
      },
    })

    const lowStockCount = lowStockProducts.filter(product => {
      const totalStock = product.variations.reduce((sum, v) => sum + v.quantity, 0)
      return totalStock <= product.lowStockAlert
    }).length

    const outOfStockCount = lowStockProducts.filter(product => {
      const totalStock = product.variations.reduce((sum, v) => sum + v.quantity, 0)
      return totalStock === 0
    }).length

    // Formas de pagamento hoje
    const paymentMethods: Record<string, number> = {
      DINHEIRO: 0,
      PIX: 0,
      CREDITO_AVISTA: 0,
      CREDITO_PARCELADO: 0,
      DEBITO: 0,
      MISTO: 0,
    }

    todaySales.forEach(sale => {
      const method = sale.paymentMethod as string
      if (paymentMethods.hasOwnProperty(method)) {
        paymentMethods[method] = (paymentMethods[method] || 0) + parseFloat(sale.total.toString())
      }
    })

    const result = {
      today: {
        total: todayTotal,
        count: todayCount,
        ticket: todayTicket,
        change: yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : 0,
      },
      month: {
        total: monthTotal,
        count: monthSales.length,
        change: lastMonthTotal > 0 ? ((monthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0,
      },
      topProductsToday,
      stock: {
        totalProducts,
        lowStockCount,
        outOfStockCount,
      },
      paymentMethods,
    }

    console.log('[Dashboard Stats] Estatísticas calculadas com sucesso')
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('❌ Erro ao buscar estatísticas:', error)
    console.error('Stack:', error?.stack)
    console.error('Tipo do erro:', error?.constructor?.name)
    
    // Retornar dados vazios em vez de erro para não quebrar o frontend
    return NextResponse.json({
      today: { total: 0, count: 0, ticket: 0, change: 0 },
      month: { total: 0, count: 0, change: 0 },
      topProductsToday: [],
      stock: { totalProducts: 0, lowStockCount: 0, outOfStockCount: 0 },
      paymentMethods: { DINHEIRO: 0, PIX: 0, CREDITO_AVISTA: 0, CREDITO_PARCELADO: 0, DEBITO: 0, MISTO: 0 },
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    })
  }
}

export const GET = withAuth(getDashboardStats)
