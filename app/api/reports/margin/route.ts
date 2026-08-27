import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { UserRole } from '@/lib/auth'
import { prisma } from '@/lib/db'

function parseDateRange(req: NextRequest): { start: Date; end: Date } {
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const today = new Date()
  const start = startDate ? new Date(startDate) : new Date(today.getFullYear(), today.getMonth(), 1)
  const end = endDate ? new Date(endDate) : today
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

async function getMarginReport(req: NextRequest) {
  try {
    const { start, end } = parseDateRange(req)

    const items = await prisma.saleItem.findMany({
      where: {
        sale: {
          cancelled: false,
          createdAt: { gte: start, lte: end },
        },
      },
      include: {
        product: {
          include: { category: true },
        },
        sale: {
          select: { id: true, discount: true, subtotal: true, total: true },
        },
      },
    })

    const byProduct = new Map<string, {
      productId: string
      productName: string
      category: string
      quantity: number
      revenue: number
      cost: number
      grossMargin: number
      netMarginPct: number
    }>()

    for (const item of items) {
      const saleSubtotal = Number(item.sale.subtotal)
      const saleDiscount = Number(item.sale.discount)
      const itemRevenueGross = Number(item.totalPrice)
      const itemDiscountShare = saleSubtotal > 0 ? (itemRevenueGross / saleSubtotal) * saleDiscount : 0
      const itemRevenueNet = itemRevenueGross - itemDiscountShare
      const itemCost = Number(item.totalCost ?? Number(item.product.cost) * item.quantity)
      const grossMargin = itemRevenueNet - itemCost

      const existing = byProduct.get(item.productId)
      if (!existing) {
        byProduct.set(item.productId, {
          productId: item.productId,
          productName: item.product.name,
          category: item.product.category.name,
          quantity: item.quantity,
          revenue: itemRevenueNet,
          cost: itemCost,
          grossMargin,
          netMarginPct: itemRevenueNet > 0 ? (grossMargin / itemRevenueNet) * 100 : 0,
        })
      } else {
        existing.quantity += item.quantity
        existing.revenue += itemRevenueNet
        existing.cost += itemCost
        existing.grossMargin += grossMargin
        existing.netMarginPct = existing.revenue > 0 ? (existing.grossMargin / existing.revenue) * 100 : 0
      }
    }

    const products = Array.from(byProduct.values()).sort((a, b) => b.grossMargin - a.grossMargin)
    const byCategory = products.reduce<Record<string, { revenue: number; cost: number; grossMargin: number }>>(
      (acc, product) => {
        const key = product.category
        if (!acc[key]) acc[key] = { revenue: 0, cost: 0, grossMargin: 0 }
        acc[key].revenue += product.revenue
        acc[key].cost += product.cost
        acc[key].grossMargin += product.grossMargin
        return acc
      },
      {}
    )

    return NextResponse.json({
      period: { start, end },
      summary: {
        revenue: products.reduce((sum, p) => sum + p.revenue, 0),
        cost: products.reduce((sum, p) => sum + p.cost, 0),
        grossMargin: products.reduce((sum, p) => sum + p.grossMargin, 0),
      },
      products,
      categories: Object.entries(byCategory).map(([name, value]) => ({
        name,
        ...value,
        marginPct: value.revenue > 0 ? (value.grossMargin / value.revenue) * 100 : 0,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao gerar relatório de margem' }, { status: 500 })
  }
}

export const GET = withAuth(getMarginReport, UserRole.GERENTE)
