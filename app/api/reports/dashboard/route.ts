import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { PaymentMethod } from '@prisma/client'

const PAYMENT_LABELS: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  CREDITO: 'Crédito',
  CREDITO_AVISTA: 'Crédito à vista',
  CREDITO_PARCELADO: 'Crédito parcelado',
  DEBITO: 'Débito',
  MISTO: 'Misto',
}

async function getReportsDashboard(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const salesWhere: any = { cancelled: false }
    if (startDate || endDate) {
      salesWhere.createdAt = {}
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        salesWhere.createdAt.gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        salesWhere.createdAt.lte = end
      }
    }

    const [sales, productsWithVariations] = await Promise.all([
      prisma.sale.findMany({
        where: salesWhere,
        include: {
          items: { include: { product: true } },
          customer: true,
          payments: true,
        },
      }),
      prisma.product.findMany({
        where: { active: true },
        include: { variations: true, category: true },
      }),
    ])

    // Produtos mais vendidos (por quantidade e receita)
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>()
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const id = item.productId
        const name = item.product.name
        const qty = item.quantity
        const revenue = parseFloat(item.totalPrice.toString())
        if (productMap.has(id)) {
          const ex = productMap.get(id)!
          ex.quantity += qty
          ex.revenue += revenue
        } else {
          productMap.set(id, { name, quantity: qty, revenue })
        }
      })
    })
    const topProducts = Array.from(productMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    // Clientes que mais compraram
    const customerMap = new Map<string, { name: string; purchaseCount: number; totalSpent: number }>()
    sales.forEach((sale) => {
      if (sale.customerId && sale.customer) {
        const id = sale.customerId
        const name = sale.customer.name
        const total = parseFloat(sale.total.toString())
        if (customerMap.has(id)) {
          const ex = customerMap.get(id)!
          ex.purchaseCount += 1
          ex.totalSpent += total
        } else {
          customerMap.set(id, { name, purchaseCount: 1, totalSpent: total })
        }
      }
    })
    const topCustomers = Array.from(customerMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)

    // Forma de pagamento mais realizada (por quantidade de vendas e por valor)
    const paymentCount = new Map<string, number>()
    const paymentTotal = new Map<string, number>()
    const initPayment = (key: string) => {
      if (!paymentCount.has(key)) {
        paymentCount.set(key, 0)
        paymentTotal.set(key, 0)
      }
    }
    sales.forEach((sale) => {
      if (sale.paymentMethod === 'MISTO' && sale.payments?.length) {
        sale.payments.forEach((p) => {
          const key = p.paymentMethod
          initPayment(key)
          paymentCount.set(key, paymentCount.get(key)! + 1)
          paymentTotal.set(key, paymentTotal.get(key)! + parseFloat(p.amount.toString()))
        })
      } else {
        const key = sale.paymentMethod
        initPayment(key)
        paymentCount.set(key, paymentCount.get(key)! + 1)
        paymentTotal.set(key, paymentTotal.get(key)! + parseFloat(sale.total.toString()))
      }
    })
    const paymentMethods = Array.from(paymentCount.keys()).map((key) => ({
      method: key,
      label: PAYMENT_LABELS[key] || key,
      count: paymentCount.get(key) || 0,
      total: paymentTotal.get(key) || 0,
    })).sort((a, b) => b.count - a.count)

    // Estoque baixo
    const lowStockItems = productsWithVariations
      .map((product) => {
        const lowVariations = product.variations.filter(
          (v) => v.quantity <= product.lowStockAlert
        )
        return {
          product: {
            id: product.id,
            name: product.name,
            category: product.category.name,
            lowStockAlert: product.lowStockAlert,
          },
          variations: lowVariations.map((v) => ({
            id: v.id,
            color: v.color,
            size: v.size,
            quantity: v.quantity,
          })),
        }
      })
      .filter((item) => item.variations.length > 0)

    return NextResponse.json({
      topProducts,
      topCustomers,
      lowStock: lowStockItems,
      paymentMethods,
    })
  } catch (error) {
    console.error('Erro ao buscar dashboard de relatórios:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar relatórios' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(getReportsDashboard)
