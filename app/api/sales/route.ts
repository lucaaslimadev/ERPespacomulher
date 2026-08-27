import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { PaymentMethod, StockType, FinancialType } from '@prisma/client'

const saleSchema = z.object({
  customerId: z.union([z.string(), z.null()]).optional().transform(v => (v == null || v === '') ? null : v),
  items: z.array(z.object({
    productId: z.string().min(1, 'Produto é obrigatório'),
    variationId: z.string().min(1, 'Variação é obrigatória'),
    quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
    unitPrice: z.number().positive('Preço deve ser maior que zero'),
  })).min(1, 'Adicione pelo menos um item ao carrinho'),
  subtotal: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  installments: z.union([z.number().int().positive(), z.null()]).optional(),
  mixedPayments: z.union([
    z.array(z.object({
      method: z.nativeEnum(PaymentMethod),
      amount: z.number().positive(),
      installments: z.number().int().positive().nullable().optional(),
    })),
    z.null(),
  ]).optional(),
})
  .refine(data => Math.abs(data.total - (data.subtotal - data.discount)) < 0.01, {
    message: 'Total deve ser igual a subtotal menos desconto',
    path: ['total'],
  })
  .refine(data => {
    if (data.paymentMethod !== 'MISTO' || !data.mixedPayments?.length) return true
    const sum = data.mixedPayments.reduce((s, p) => s + p.amount, 0)
    return Math.abs(sum - data.total) < 0.01
  }, {
    message: 'Soma dos pagamentos mistos deve ser igual ao total da venda',
    path: ['mixedPayments'],
  })

const DEFAULT_SALES_LIMIT = 200
const MAX_SALES_LIMIT = 500

async function getSales(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userId = searchParams.get('userId')
    const cancelled = searchParams.get('cancelled')
    const search = searchParams.get('search')
    const pageParam = Number(searchParams.get('page') || '1')
    const limitParam = Number(searchParams.get('limit') || DEFAULT_SALES_LIMIT)
    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1
    const limit = Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(Math.floor(limitParam), MAX_SALES_LIMIT)
      : DEFAULT_SALES_LIMIT

    const where: any = {}

    if (startDate) {
      const start = new Date(startDate)
      if (isNaN(start.getTime())) {
        return NextResponse.json({ error: 'Data inicial inválida' }, { status: 400 })
      }
      start.setHours(0, 0, 0, 0)
      where.createdAt = where.createdAt || {}
      where.createdAt.gte = start
    }
    if (endDate) {
      const end = new Date(endDate)
      if (isNaN(end.getTime())) {
        return NextResponse.json({ error: 'Data final inválida' }, { status: 400 })
      }
      end.setHours(23, 59, 59, 999)
      where.createdAt = where.createdAt || {}
      where.createdAt.lte = end
    }

    if (userId) {
      where.userId = userId
    }

    if (cancelled !== null && cancelled !== undefined) {
      where.cancelled = cancelled === 'true'
    }

    if (search && search.trim()) {
      const searchTerm = search.trim()
      where.OR = [
        { customer: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { user: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { id: { contains: searchTerm, mode: 'insensitive' } },
      ]
    }

    const sales = await prisma.sale.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        customer: true,
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
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
        payments: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.sale.count({ where })

    return NextResponse.json({
      sales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao buscar vendas:', error)
    }
    return NextResponse.json({ error: 'Erro ao buscar vendas' }, { status: 500 })
  }
}

async function createSale(req: AuthenticatedRequest) {
  try {
    const { user } = req
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const body = await req.json()
    // Garantir números (front pode enviar string)
    if (typeof body.subtotal === 'string') body.subtotal = parseFloat(body.subtotal) || 0
    if (typeof body.discount === 'string') body.discount = parseFloat(body.discount) || 0
    if (typeof body.total === 'string') body.total = parseFloat(body.total) || 0
    if (Array.isArray(body.items)) {
      body.items = body.items.map((it: any) => ({
        ...it,
        quantity: typeof it.quantity === 'string' ? parseInt(it.quantity, 10) || 0 : it.quantity,
        unitPrice: typeof it.unitPrice === 'string' ? parseFloat(it.unitPrice) || 0 : it.unitPrice,
      }))
    }
    const data = saleSchema.parse(body)

    // Validação de variações existem (estoque é verificado DENTRO da transação para evitar race condition)
    for (const item of data.items) {
      const variation = await prisma.productVariation.findUnique({
        where: { id: item.variationId },
      })
      if (!variation) {
        return NextResponse.json(
          { error: `Variação ${item.variationId} não encontrada` },
          { status: 404 }
        )
      }
    }

    const productIds = Array.from(new Set(data.items.map((item) => item.productId)))
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, cost: true },
    })
    const costMap = new Map(products.map((p) => [p.id, Number(p.cost)]))

    const installmentsData: { installmentNumber: number; amount: string; dueDate: Date }[] = []
    if (data.paymentMethod === 'CREDITO_PARCELADO' && data.installments && data.installments >= 2) {
      const installmentAmount = data.total / data.installments
      const today = new Date()
      for (let i = 1; i <= data.installments; i++) {
        const dueDate = new Date(today)
        dueDate.setMonth(dueDate.getMonth() + i)
        installmentsData.push({
          installmentNumber: i,
          amount: installmentAmount.toString(),
          dueDate,
        })
      }
    }

    const saleId = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          customerId: data.customerId || null,
          userId: user.userId,
          subtotal: data.subtotal.toString(),
          discount: data.discount.toString(),
          total: data.total.toString(),
          paymentMethod: data.paymentMethod,
          items: {
            create: data.items.map(item => ({
              productId: item.productId,
              variationId: item.variationId,
              quantity: item.quantity,
              unitPrice: item.unitPrice.toString(),
              unitCost: (costMap.get(item.productId) || 0).toFixed(2),
              totalCost: ((costMap.get(item.productId) || 0) * item.quantity).toFixed(2),
              totalPrice: (item.unitPrice * item.quantity).toString(),
            })),
          },
          installments: installmentsData.length > 0 ? { create: installmentsData } : undefined,
        },
      })

      if (data.paymentMethod === 'MISTO' && data.mixedPayments && data.mixedPayments.length > 0) {
        for (const payment of data.mixedPayments) {
          await tx.salePayment.create({
            data: {
              saleId: sale.id,
              paymentMethod: payment.method,
              amount: payment.amount.toString(),
              installments: payment.installments || null,
            },
          })
        }
      }

      for (const item of data.items) {
        // Atualização atômica com verificação de estoque (evita race condition)
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
            reason: `Venda #${sale.id}`,
          },
        })
      }

      if (data.paymentMethod === 'MISTO' && data.mixedPayments && data.mixedPayments.length > 0) {
        for (const payment of data.mixedPayments) {
          if (payment.method === 'CREDIARIO') {
            const dueDate = new Date()
            dueDate.setDate(dueDate.getDate() + 30)
            await tx.accountsReceivable.create({
              data: {
                saleId: sale.id,
                description: `Venda #${sale.id.substring(0, 8)} - ${payment.method}`,
                customerId: data.customerId || null,
                amount: payment.amount.toString(),
                dueDate,
                category: 'Crediário',
              },
            })
          } else if (payment.method === 'CREDITO_PARCELADO' && payment.installments && payment.installments >= 2) {
            const installmentAmount = payment.amount / payment.installments
            const today = new Date()
            for (let i = 1; i <= payment.installments; i++) {
              const dueDate = new Date(today)
              dueDate.setMonth(dueDate.getMonth() + i)
              await tx.accountsReceivable.create({
                data: {
                  saleId: sale.id,
                  description: `Venda #${sale.id.substring(0, 8)} - Crédito parcelado (${i}/${payment.installments})`,
                  customerId: data.customerId || null,
                  amount: installmentAmount.toString(),
                  dueDate,
                  category: 'Crédito Parcelado',
                },
              })
            }
          } else {
            await tx.financialTransaction.create({
              data: {
                type: FinancialType.ENTRADA,
                category: 'Venda',
                description: `Venda #${sale.id.substring(0, 8)} - ${payment.method}`,
                amount: payment.amount.toString(),
                date: new Date(),
              },
            })
          }
        }
      } else if (data.paymentMethod === 'CREDIARIO') {
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 30)
        await tx.accountsReceivable.create({
          data: {
            saleId: sale.id,
            description: `Venda #${sale.id.substring(0, 8)} - Crediário`,
            customerId: data.customerId || null,
            amount: data.total.toString(),
            dueDate,
            category: 'Crediário',
          },
        })
      } else if (data.paymentMethod === 'CREDITO_PARCELADO' && installmentsData.length > 0) {
        for (const installment of installmentsData) {
          await tx.accountsReceivable.create({
            data: {
              saleId: sale.id,
              description: `Venda #${sale.id.substring(0, 8)} - Crédito parcelado (${installment.installmentNumber}/${installmentsData.length})`,
              customerId: data.customerId || null,
              amount: installment.amount,
              dueDate: installment.dueDate,
              category: 'Crédito Parcelado',
            },
          })
        }
      } else {
        await tx.financialTransaction.create({
          data: {
            type: FinancialType.ENTRADA,
            category: 'Venda',
            description: `Venda #${sale.id.substring(0, 8)}`,
            amount: data.total.toString(),
            date: new Date(),
          },
        })
      }

      if (data.discount > 0) {
        await tx.discountLog.create({
          data: {
            saleId: sale.id,
            userId: user.userId,
            discountType: data.discount < data.subtotal ? 'PERCENTUAL' : 'VALOR_FIXO',
            value: data.discount.toString(),
          },
        })
      }

      return sale.id
    })

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        customer: true,
        user: true,
        items: {
          include: {
            product: true,
            variation: true,
          },
        },
        installments: { orderBy: { installmentNumber: 'asc' } },
        payments: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!sale) {
      return NextResponse.json({ error: 'Venda criada mas não encontrada' }, { status: 500 })
    }
    return NextResponse.json({ sale }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => e.message).filter(Boolean).join('; ') || 'Dados inválidos'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('Estoque insuficiente')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('Variação não encontrada')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao criar venda:', error)
    }
    return NextResponse.json({
      error: 'Erro ao criar venda',
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined,
    }, { status: 500 })
  }
}

export const GET = withAuth(getSales)
export const POST = withAuth(createSale)
