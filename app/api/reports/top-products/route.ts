import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/db'

async function getTopProducts(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '10')

    const where: any = {
      cancelled: false,
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    // Agrupar por produto
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>()

    sales.forEach(sale => {
      sale.items.forEach(item => {
        const productId = item.productId
        const productName = item.product.name
        const quantity = item.quantity
        const revenue = parseFloat(item.totalPrice.toString())

        if (productMap.has(productId)) {
          const existing = productMap.get(productId)!
          existing.quantity += quantity
          existing.revenue += revenue
        } else {
          productMap.set(productId, { name: productName, quantity, revenue })
        }
      })
    })

    const topProducts = Array.from(productMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit)

    return NextResponse.json({ products: topProducts })
  } catch (error) {
    console.error('Erro ao buscar produtos mais vendidos:', error)
    return NextResponse.json({ error: 'Erro ao buscar produtos mais vendidos' }, { status: 500 })
  }
}

export const GET = withAuth(getTopProducts)
