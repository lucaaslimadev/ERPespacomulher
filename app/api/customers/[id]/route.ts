import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'

async function getCustomer(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        sales: {
          include: {
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
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Calcular ticket médio
    const totalSales = customer.sales.length
    const totalValue = customer.sales.reduce((sum, sale) => {
      return sum + parseFloat(sale.total.toString())
    }, 0)
    const averageTicket = totalSales > 0 ? totalValue / totalSales : 0

    return NextResponse.json({
      customer,
      stats: {
        totalSales,
        totalValue,
        averageTicket,
      },
    })
  } catch (error) {
    console.error('Erro ao buscar cliente:', error)
    return NextResponse.json({ error: 'Erro ao buscar cliente' }, { status: 500 })
  }
}

async function deleteCustomer(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { sales: true },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Verificar se tem vendas associadas
    if (customer._count.sales > 0) {
      return NextResponse.json({ 
        error: 'Não é possível excluir cliente com vendas associadas' 
      }, { status: 400 })
    }

    await prisma.customer.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Cliente excluído com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir cliente:', error)
    return NextResponse.json({ error: 'Erro ao excluir cliente' }, { status: 500 })
  }
}

export const GET = withAuth(getCustomer)
export const DELETE = withAuth(deleteCustomer)
