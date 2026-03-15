import { NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { StockType, FinancialType } from '@prisma/client'

const cancelSchema = z.object({
  reason: z.string().optional(),
})

async function cancelSale(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { user } = req
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (user.role === 'CAIXA') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const { reason } = cancelSchema.parse(body)

    const sale = await prisma.sale.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { variation: true } },
        accountsReceivable: { where: { received: true } },
      },
    })

    if (!sale) {
      return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 })
    }
    if (sale.cancelled) {
      return NextResponse.json({ error: 'Venda já foi cancelada' }, { status: 400 })
    }
    if (sale.accountsReceivable && sale.accountsReceivable.length > 0) {
      return NextResponse.json({
        error: 'Não é possível cancelar: esta venda possui parcelas já recebidas. Entre em contato com o suporte.',
      }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        await tx.productVariation.update({
          where: { id: item.variationId },
          data: { quantity: { increment: item.quantity } },
        })
        await tx.stockLog.create({
          data: {
            productId: item.productId,
            variationId: item.variationId,
            userId: user.userId,
            type: StockType.ENTRADA_DEVOLUCAO,
            quantity: item.quantity,
            reason: `Cancelamento da venda #${sale.id}`,
          },
        })
      }

      await tx.sale.update({
        where: { id: params.id },
        data: {
          cancelled: true,
          cancelledAt: new Date(),
          cancelledBy: user.userId,
        },
      })

      await tx.cancellationLog.create({
        data: {
          saleId: params.id,
          userId: user.userId,
          reason: reason || null,
        },
      })

      await tx.financialTransaction.create({
        data: {
          type: FinancialType.SAIDA,
          category: 'Cancelamento',
          description: `Cancelamento da venda #${sale.id}`,
          amount: sale.total.toString(),
          date: new Date(),
        },
      })

      await tx.accountsReceivable.deleteMany({
        where: { saleId: params.id },
      })
    })

    return NextResponse.json({ message: 'Venda cancelada com sucesso' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => e.message).filter(Boolean).join('; ') || 'Dados inválidos'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao cancelar venda:', error)
    }
    return NextResponse.json({ error: 'Erro ao cancelar venda' }, { status: 500 })
  }
}

export const POST = withAuth(cancelSale)
