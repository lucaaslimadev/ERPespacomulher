import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/db'

async function getReceipt(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const sale = await prisma.sale.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        user: {
          select: {
            name: true,
            username: true,
          },
        },
        items: {
          include: {
            product: true,
            variation: true,
          },
        },
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
    })

    if (!sale) {
      return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ sale })
  } catch (error) {
    console.error('Erro ao buscar recibo:', error)
    return NextResponse.json({ error: 'Erro ao buscar recibo' }, { status: 500 })
  }
}

export const GET = withAuth(getReceipt)
