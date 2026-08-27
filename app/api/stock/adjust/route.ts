import { NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { StockType } from '@prisma/client'

const LOSS_REASONS = [
  'AVARIA',
  'FURTO',
  'VENCIMENTO',
  'EXTRAVIO',
  'ERRO_CONTAGEM',
  'OUTROS',
] as const

const adjustSchema = z.object({
  variationId: z.string(),
  quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  type: z.nativeEnum(StockType),
  reason: z.string().optional(),
  lossReason: z.enum(LOSS_REASONS).optional(),
}).superRefine((data, ctx) => {
  if (data.type === StockType.SAIDA_PERDA && !data.lossReason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Informe lossReason para SAIDA_PERDA',
      path: ['lossReason'],
    })
  }
})

async function adjustStock(req: AuthenticatedRequest) {
  try {
    const { user } = req
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    // Apenas GERENTE e ADMIN podem ajustar estoque
    if (user.role === 'CAIXA') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const data = adjustSchema.parse(body)

    const isEntrada = data.type === StockType.ENTRADA_AJUSTE ||
      data.type === StockType.ENTRADA_COMPRA ||
      data.type === StockType.ENTRADA_DEVOLUCAO

    const newQuantity = await prisma.$transaction(async (tx) => {
      const variation = await tx.productVariation.findUnique({
        where: { id: data.variationId },
        include: { product: true },
      })

      if (!variation) {
        throw new Error('Variação não encontrada')
      }

      const updated = await tx.productVariation.updateMany({
        where: isEntrada
          ? { id: data.variationId }
          : { id: data.variationId, quantity: { gte: data.quantity } },
        data: {
          quantity: isEntrada
            ? { increment: data.quantity }
            : { decrement: data.quantity },
        },
      })
      if (updated.count === 0) {
        throw new Error('Quantidade insuficiente em estoque')
      }

      await tx.stockLog.create({
        data: {
          productId: variation.productId,
          variationId: data.variationId,
          userId: user.userId,
          type: data.type,
          quantity: data.quantity,
          reason: data.type === StockType.SAIDA_PERDA
            ? `PERDA:${data.lossReason}${data.reason ? ` - ${data.reason}` : ''}`
            : data.reason || null,
        },
      })
      const current = await tx.productVariation.findUnique({
        where: { id: data.variationId },
        select: { quantity: true },
      })
      return current?.quantity ?? 0
    })

    return NextResponse.json({ 
      message: 'Estoque ajustado com sucesso',
      newQuantity,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => e.message).filter(Boolean).join('; ') || 'Dados inválidos'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    if (error instanceof Error) {
      if (error.message === 'Variação não encontrada') {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message === 'Quantidade insuficiente em estoque') {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    if (process.env.NODE_ENV === 'development' && error instanceof Error) {
      console.error('Erro ao ajustar estoque:', error)
    }
    return NextResponse.json({ error: 'Erro ao ajustar estoque' }, { status: 500 })
  }
}

export const POST = withAuth(adjustStock)
