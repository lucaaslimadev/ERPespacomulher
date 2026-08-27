import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { StockType, FinancialType } from '@prisma/client'

const returnSchema = z.object({
  saleId: z.string().min(1, 'ID da venda é obrigatório'),
  type: z.enum(['DEVOLUCAO', 'TROCA']),
  reason: z.string().optional(),
  items: z.array(z.object({
    saleItemId: z.string(),
    productId: z.string(),
    variationId: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
  })).min(1, 'Selecione pelo menos um item para devolver'),
  exchangeItems: z.array(z.object({
    productId: z.string(),
    variationId: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
  })).optional(),
})

async function createReturn(req: AuthenticatedRequest) {
  try {
    const { user } = req
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (user.role === 'CAIXA') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const data = returnSchema.parse(body)

    // Verificar se a venda existe
    const sale = await prisma.sale.findUnique({
      where: { id: data.saleId },
      include: {
        items: true,
        accountsReceivable: true,
      },
    })

    if (!sale) {
      return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 })
    }

    if (sale.cancelled) {
      return NextResponse.json({ error: 'Não é possível devolver itens de uma venda cancelada' }, { status: 400 })
    }

    // Calcular valor total da devolução
    const refundAmount = data.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)

    // Calcular valor total da troca (se houver)
    const exchangeAmount = data.exchangeItems?.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0) || 0

    // Diferença a pagar ou receber
    const difference = exchangeAmount - refundAmount

    const returnId = await prisma.$transaction(async (tx) => {
      // Criar registro de devolução/troca
      const returnRecord = await tx.return.create({
        data: {
          saleId: data.saleId,
          userId: user.userId,
          type: data.type,
          reason: data.reason || null,
          refundAmount: refundAmount.toString(),
          status: 'COMPLETED',
          processedAt: new Date(),
          items: {
            create: data.items.map(item => ({
              saleItemId: item.saleItemId,
              productId: item.productId,
              variationId: item.variationId,
              quantity: item.quantity,
              unitPrice: item.unitPrice.toString(),
              totalPrice: (item.unitPrice * item.quantity).toString(),
            })),
          },
          exchangeItems: data.exchangeItems ? {
            create: data.exchangeItems.map(item => ({
              productId: item.productId,
              variationId: item.variationId,
              quantity: item.quantity,
              unitPrice: item.unitPrice.toString(),
              totalPrice: (item.unitPrice * item.quantity).toString(),
            })),
          } : undefined,
        },
      })

      // Devolver estoque dos itens devolvidos
      for (const item of data.items) {
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
            reason: `${data.type === 'DEVOLUCAO' ? 'Devolução' : 'Troca'} - Venda #${sale.id.substring(0, 8)}`,
          },
        })
      }

      // Se for troca, dar baixa no estoque dos novos itens
      if (data.type === 'TROCA' && data.exchangeItems) {
        for (const item of data.exchangeItems) {
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

          await tx.stockLog.create({
            data: {
              productId: item.productId,
              variationId: item.variationId,
              userId: user.userId,
              type: StockType.SAIDA_VENDA,
              quantity: item.quantity,
              reason: `Troca - Venda #${sale.id.substring(0, 8)}`,
            },
          })
        }
      }

      // Registrar movimentação financeira
      if (data.type === 'DEVOLUCAO') {
        // Devolução: registrar saída (reembolso)
        await tx.financialTransaction.create({
          data: {
            type: FinancialType.SAIDA,
            category: 'Devolução',
            description: `Devolução - Venda #${sale.id.substring(0, 8)}`,
            amount: refundAmount.toString(),
            date: new Date(),
          },
        })
      } else if (data.type === 'TROCA') {
        // Troca: registrar diferença se houver
        if (difference > 0) {
          // Cliente deve pagar a diferença
          await tx.financialTransaction.create({
            data: {
              type: FinancialType.ENTRADA,
              category: 'Troca',
              description: `Troca (diferença a pagar) - Venda #${sale.id.substring(0, 8)}`,
              amount: difference.toString(),
              date: new Date(),
            },
          })
        } else if (difference < 0) {
          // Devolver diferença ao cliente
          await tx.financialTransaction.create({
            data: {
              type: FinancialType.SAIDA,
              category: 'Troca',
              description: `Troca (diferença a receber) - Venda #${sale.id.substring(0, 8)}`,
              amount: Math.abs(difference).toString(),
              date: new Date(),
            },
          })
        }
      }

      return returnRecord.id
    })

    const returnRecord = await prisma.return.findUnique({
      where: { id: returnId },
      include: {
        items: {
          include: {
            product: true,
            variation: true,
          },
        },
        exchangeItems: {
          include: {
            product: true,
            variation: true,
          },
        },
      },
    })

    return NextResponse.json({ 
      return: returnRecord,
      message: data.type === 'DEVOLUCAO' 
        ? 'Devolução processada com sucesso' 
        : 'Troca processada com sucesso',
    }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => e.message).filter(Boolean).join('; ') || 'Dados inválidos'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('Estoque insuficiente')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao processar devolução/troca:', error)
    }
    return NextResponse.json({
      error: 'Erro ao processar devolução/troca',
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined,
    }, { status: 500 })
  }
}

async function getReturns(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const saleId = searchParams.get('saleId')
    const type = searchParams.get('type')

    const where: any = {}
    if (saleId) where.saleId = saleId
    if (type) where.type = type

    const returns = await prisma.return.findMany({
      where,
      include: {
        sale: {
          include: {
            customer: true,
          },
        },
        user: {
          select: {
            id: true,
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
        exchangeItems: {
          include: {
            product: true,
            variation: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ returns })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao buscar devoluções/trocas:', error)
    }
    return NextResponse.json({ error: 'Erro ao buscar devoluções/trocas' }, { status: 500 })
  }
}

export const POST = withAuth(createReturn)
export const GET = withAuth(getReturns)
