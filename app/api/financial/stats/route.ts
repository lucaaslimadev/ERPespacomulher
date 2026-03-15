import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/db'

async function getFinancialStats(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {
      cancelled: false,
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        where.createdAt.gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    // Buscar vendas
    const sales = await prisma.sale.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
            variation: true,
          },
        },
        customer: true,
      },
    })

    // Itens mais vendidos
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
      .slice(0, 10)

    // Clientes com mais compras
    const customerMap = new Map<string, { name: string; purchaseCount: number; totalSpent: number }>()
    sales.forEach(sale => {
      if (sale.customerId && sale.customer) {
        const customerId = sale.customerId
        const customerName = sale.customer.name
        const totalSpent = parseFloat(sale.total.toString())

        if (customerMap.has(customerId)) {
          const existing = customerMap.get(customerId)!
          existing.purchaseCount += 1
          existing.totalSpent += totalSpent
        } else {
          customerMap.set(customerId, { name: customerName, purchaseCount: 1, totalSpent })
        }
      }
    })

    const topCustomers = Array.from(customerMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)

    // Produtos com maior saída (maior quantidade vendida)
    const topProductsByQuantity = Array.from(productMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    return NextResponse.json({
      topProducts,
      topCustomers,
      topProductsByQuantity,
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas financeiras:', error)
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 })
  }
}

export const GET = withAuth(getFinancialStats)
