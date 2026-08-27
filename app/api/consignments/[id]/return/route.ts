import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const returnSchema = z.object({
  items: z.array(z.object({
    itemId: z.string(),
    returnedQuantity: z.number().int().nonnegative(),
  })),
})

async function registerReturn(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { user } = req
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const data = returnSchema.parse(body)

    const consignment = await prisma.consignment.findUnique({
      where: { id: params.id },
      include: { items: true },
    })

    if (!consignment) {
      return NextResponse.json({ error: 'Consignado não encontrado' }, { status: 404 })
    }

    if (consignment.status === 'COMPLETED' || consignment.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Consignado já foi finalizado ou cancelado' }, { status: 400 })
    }

    await prisma.$transaction(async (tx: any) => {
      let hasPartialReturn = false

      for (const returnItem of data.items) {
        const item = consignment.items.find(i => i.id === returnItem.itemId)
        if (!item) continue

        const newReturned = item.returned + returnItem.returnedQuantity
        if (newReturned > item.quantity) {
          throw new Error('Quantidade devolvida maior que quantidade enviada')
        }

        // Atualizar item com quantidade devolvida
        await tx.consignmentItem.update({
          where: { id: returnItem.itemId },
          data: { returned: newReturned },
        })

        // Devolver estoque
        if (returnItem.returnedQuantity > 0) {
          await tx.productVariation.update({
            where: { id: item.variationId },
            data: { quantity: { increment: returnItem.returnedQuantity } },
          })

          await tx.stockLog.create({
            data: {
              productId: item.productId,
              variationId: item.variationId,
              userId: user.userId,
              type: 'ENTRADA_DEVOLUCAO',
              quantity: returnItem.returnedQuantity,
              reason: `Retorno de consignado #${consignment.id.substring(0, 8)}`,
            },
          })
        }

        // Verificar se é retorno parcial
        if (newReturned < item.quantity) {
          hasPartialReturn = true
        }
      }

      // Atualizar status do consignado
      await tx.consignment.update({
        where: { id: params.id },
        data: {
          status: hasPartialReturn ? 'PARTIAL_RETURN' : 'SENT',
          returnDate: new Date(),
        },
      })
    })

    const updatedConsignment = await prisma.consignment.findUnique({
      where: { id: params.id },
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

    return NextResponse.json({ consignment: updatedConsignment })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => e.message).filter(Boolean).join('; ') || 'Dados inválidos'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao registrar retorno:', error)
    }
    return NextResponse.json({ error: 'Erro ao registrar retorno' }, { status: 500 })
  }
}

export const POST = withAuth(registerReturn)
