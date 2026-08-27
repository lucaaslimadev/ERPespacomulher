import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const consignmentSchema = z.object({
  customerId: z.string().min(1, 'Cliente é obrigatório'),
  items: z.array(z.object({
    productId: z.string(),
    variationId: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
  })).min(1, 'Adicione pelo menos um item'),
  notes: z.string().optional(),
})

async function createConsignment(req: AuthenticatedRequest) {
  try {
    const { user } = req
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const data = consignmentSchema.parse(body)

    const consignmentId = await prisma.$transaction(async (tx) => {
      // Criar consignado
      const consignment = await tx.consignment.create({
        data: {
          customerId: data.customerId,
          userId: user.userId,
          notes: data.notes || null,
          items: {
            create: data.items.map(item => ({
              productId: item.productId,
              variationId: item.variationId,
              quantity: item.quantity,
              unitPrice: item.unitPrice.toString(),
            })),
          },
        },
      })

      // Reservar estoque (diminuir quantidade disponível)
      for (const item of data.items) {
        const result = await tx.$executeRaw`
          UPDATE product_variations
          SET quantity = quantity - ${item.quantity}
          WHERE id = ${item.variationId} AND quantity >= ${item.quantity}
        `
        
        if (result === 0) {
          const variation = await tx.productVariation.findUnique({
            where: { id: item.variationId },
            select: { color: true, size: true, quantity: true },
          })
          throw new Error(
            variation
              ? `Estoque insuficiente para ${variation.color} ${variation.size} (disponível: ${variation.quantity})`
              : 'Variação não encontrada',
          )
        }

        // Registrar movimentação de estoque
        await tx.stockLog.create({
          data: {
            productId: item.productId,
            variationId: item.variationId,
            userId: user.userId,
            type: 'SAIDA_VENDA', // Usando tipo existente
            quantity: item.quantity,
            reason: `Consignado #${consignment.id.substring(0, 8)}`,
          },
        })
      }

      return consignment.id
    })

    const consignment = await prisma.consignment.findUnique({
      where: { id: consignmentId },
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

    return NextResponse.json({ consignment }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => e.message).filter(Boolean).join('; ') || 'Dados inválidos'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('Estoque insuficiente')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao criar consignado:', error)
    }
    return NextResponse.json({
      error: 'Erro ao criar consignado',
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined,
    }, { status: 500 })
  }
}

async function getConsignments(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get('customerId')
    const status = searchParams.get('status')

    const where: any = {}
    if (customerId) where.customerId = customerId
    if (status) where.status = status

    const consignments = await prisma.consignment.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ consignments })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao buscar consignados:', error)
    }
    return NextResponse.json({ error: 'Erro ao buscar consignados' }, { status: 500 })
  }
}

export const POST = withAuth(createConsignment)
export const GET = withAuth(getConsignments)
