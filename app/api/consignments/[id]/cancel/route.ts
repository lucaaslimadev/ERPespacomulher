import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'

async function cancelConsignment(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { user } = req
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const consignment = await prisma.consignment.findUnique({
      where: { id: params.id },
      include: { items: true },
    })

    if (!consignment) {
      return NextResponse.json({ error: 'Consignado não encontrado' }, { status: 404 })
    }

    if (consignment.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Consignado já foi finalizado' }, { status: 400 })
    }

    if (consignment.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Consignado já foi cancelado' }, { status: 400 })
    }

    await prisma.$transaction(async (tx: any) => {
      // Devolver todo o estoque (apenas itens não devolvidos)
      for (const item of consignment.items) {
        const notReturned = item.quantity - item.returned
        if (notReturned > 0) {
          await tx.productVariation.update({
            where: { id: item.variationId },
            data: { quantity: { increment: notReturned } },
          })

          await tx.stockLog.create({
            data: {
              productId: item.productId,
              variationId: item.variationId,
              userId: user.userId,
              type: 'ENTRADA_DEVOLUCAO',
              quantity: notReturned,
              reason: `Cancelamento de consignado #${consignment.id.substring(0, 8)}`,
            },
          })
        }
      }

      // Atualizar status
      await tx.consignment.update({
        where: { id: params.id },
        data: {
          status: 'CANCELLED',
          returnDate: new Date(),
        },
      })
    })

    return NextResponse.json({ message: 'Consignado cancelado com sucesso' })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao cancelar consignado:', error)
    }
    return NextResponse.json({ error: 'Erro ao cancelar consignado' }, { status: 500 })
  }
}

export const POST = withAuth(cancelConsignment)
