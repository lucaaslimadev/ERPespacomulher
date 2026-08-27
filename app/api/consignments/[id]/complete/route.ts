import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { FinancialType, PaymentMethod } from '@prisma/client'

const completeSchema = z.object({
  paymentMethod: z.enum(['DINHEIRO', 'PIX', 'CREDITO_AVISTA', 'DEBITO']),
})

async function completeConsignment(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { user } = req
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const data = completeSchema.parse(body)

    const consignment = await prisma.consignment.findUnique({
      where: { id: params.id },
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

    if (!consignment) {
      return NextResponse.json({ error: 'Consignado não encontrado' }, { status: 404 })
    }

    if (consignment.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Consignado já foi finalizado' }, { status: 400 })
    }

    if (consignment.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Consignado foi cancelado' }, { status: 400 })
    }

    // Calcular itens vendidos (enviados - devolvidos)
    const soldItems = consignment.items
      .map(item => ({
        ...item,
        soldQuantity: item.quantity - item.returned,
      }))
      .filter(item => item.soldQuantity > 0)

    if (soldItems.length === 0) {
      return NextResponse.json({ error: 'Nenhum item foi vendido (todos foram devolvidos)' }, { status: 400 })
    }

    const saleId = await prisma.$transaction(async (tx: any) => {
      // Calcular totais
      const subtotal = soldItems.reduce((sum, item) => 
        sum + (parseFloat(item.unitPrice.toString()) * item.soldQuantity), 0
      )

      // Criar venda automática
      const sale = await tx.sale.create({
        data: {
          customerId: consignment.customerId,
          userId: user.userId,
          subtotal: subtotal.toString(),
          discount: '0',
          total: subtotal.toString(),
          paymentMethod: data.paymentMethod as PaymentMethod,
          items: {
            create: soldItems.map(item => ({
              productId: item.productId,
              variationId: item.variationId,
              quantity: item.soldQuantity,
              unitPrice: item.unitPrice.toString(),
              totalPrice: (parseFloat(item.unitPrice.toString()) * item.soldQuantity).toString(),
            })),
          },
        },
      })

      // Registrar transação financeira
      await tx.financialTransaction.create({
        data: {
          type: FinancialType.ENTRADA,
          category: 'Venda',
          description: `Venda de consignado #${consignment.id.substring(0, 8)}`,
          amount: subtotal.toString(),
          date: new Date(),
        },
      })

      // Atualizar status do consignado
      await tx.consignment.update({
        where: { id: params.id },
        data: {
          status: 'COMPLETED',
          returnDate: new Date(),
        },
      })

      return sale.id
    })

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        customer: true,
        user: { select: { id: true, name: true, username: true } },
        items: {
          include: {
            product: true,
            variation: true,
          },
        },
      },
    })

    return NextResponse.json({ 
      message: 'Consignado finalizado com sucesso',
      sale,
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => e.message).filter(Boolean).join('; ') || 'Dados inválidos'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao finalizar consignado:', error)
    }
    return NextResponse.json({
      error: 'Erro ao finalizar consignado',
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined,
    }, { status: 500 })
  }
}

export const POST = withAuth(completeConsignment)
