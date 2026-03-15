import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/db'

async function getLowStock(req: NextRequest) {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      include: {
        variations: true,
        category: true,
      },
    })

    const lowStockItems = products
      .map(product => {
        const lowStockVariations = product.variations.filter(
          v => v.quantity <= product.lowStockAlert
        )
        return {
          product: {
            id: product.id,
            name: product.name,
            category: product.category.name,
            lowStockAlert: product.lowStockAlert,
          },
          variations: lowStockVariations.map(v => ({
            id: v.id,
            color: v.color,
            size: v.size,
            quantity: v.quantity,
          })),
        }
      })
      .filter(item => item.variations.length > 0)

    return NextResponse.json({ items: lowStockItems })
  } catch (error) {
    console.error('Erro ao buscar estoque baixo:', error)
    return NextResponse.json({ error: 'Erro ao buscar estoque baixo' }, { status: 500 })
  }
}

export const GET = withAuth(getLowStock)
