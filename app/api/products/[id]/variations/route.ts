import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const variationSchema = z.object({
  id: z.string().optional(),
  color: z.string().min(1, 'Cor é obrigatória'),
  size: z.string().min(1, 'Tamanho é obrigatório'),
  quantity: z.number().int().nonnegative(),
})

async function getVariations(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const variations = await prisma.productVariation.findMany({
      where: { productId: params.id },
      orderBy: [{ color: 'asc' }, { size: 'asc' }],
    })

    return NextResponse.json({ variations })
  } catch (error) {
    console.error('Erro ao buscar variações:', error)
    return NextResponse.json({ error: 'Erro ao buscar variações' }, { status: 500 })
  }
}

async function createVariation(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { user } = req
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const data = variationSchema.parse(body)
    const { id: _id, ...createData } = data

    const variation = await prisma.productVariation.create({
      data: {
        ...createData,
        productId: params.id,
      },
    })

    return NextResponse.json({ variation }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Erro ao criar variação:', error)
    return NextResponse.json({ error: 'Erro ao criar variação' }, { status: 500 })
  }
}

async function updateVariation(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { user } = req
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const data = variationSchema.parse(body)

    if (!data.id) {
      return NextResponse.json({ error: 'ID da variação é obrigatório para atualização' }, { status: 400 })
    }

    // Verificar se a variação pertence ao produto
    const existingVariation = await prisma.productVariation.findUnique({
      where: { id: data.id },
    })

    if (!existingVariation) {
      return NextResponse.json({ error: 'Variação não encontrada' }, { status: 404 })
    }

    if (existingVariation.productId !== params.id) {
      return NextResponse.json({ error: 'Variação não pertence a este produto' }, { status: 400 })
    }

    const variation = await prisma.productVariation.update({
      where: { id: data.id },
      data: {
        color: data.color,
        size: data.size,
        quantity: data.quantity,
      },
    })

    return NextResponse.json({ variation })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Erro ao atualizar variação:', error)
    return NextResponse.json({ error: 'Erro ao atualizar variação' }, { status: 500 })
  }
}

export const GET = withAuth(getVariations)
export const POST = withAuth(createVariation)
export const PUT = withAuth(updateVariation)
