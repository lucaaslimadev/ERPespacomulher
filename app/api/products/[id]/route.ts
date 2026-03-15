import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const productSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional(),
  price: z.number().positive().optional(),
  cost: z.number().nonnegative().optional(),
  barcode: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  active: z.boolean().optional(),
  lowStockAlert: z.number().int().nonnegative().optional(),
})

async function getProduct(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        variations: {
          orderBy: [{ color: 'asc' }, { size: 'asc' }],
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ product })
  } catch (error: any) {
    console.error('❌ Erro ao buscar produto:', error)
    console.error('Stack:', error?.stack)
    return NextResponse.json({ 
      error: 'Erro ao buscar produto',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

async function updateProduct(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  let body: any = null
  try {
    const params = await context.params
    const { user } = req
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    try {
      body = await req.json()
      console.log('📥 Body recebido:', JSON.stringify(body, null, 2))
    } catch (e) {
      console.error('❌ Erro ao fazer parse do body:', e)
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const data = productSchema.parse(body)
    console.log('✅ Dados validados:', data)

    // Verificar se o produto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
    })

    if (!existingProduct) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    // Verificar se barcode já existe em outro produto
    if (data.barcode !== undefined && data.barcode) {
      const barcodeExists = await prisma.product.findFirst({
        where: {
          barcode: data.barcode,
          id: { not: params.id }, // Excluir o produto atual
        },
      })
      if (barcodeExists) {
        return NextResponse.json({ 
          error: 'Código de barras já está em uso por outro produto' 
        }, { status: 400 })
      }
    }

    // Verificar se SKU já existe em outro produto
    if (data.sku !== undefined && data.sku) {
      const skuExists = await prisma.product.findFirst({
        where: {
          sku: data.sku,
          id: { not: params.id }, // Excluir o produto atual
        },
      })
      if (skuExists) {
        return NextResponse.json({ 
          error: 'SKU já está em uso por outro produto' 
        }, { status: 400 })
      }
    }

    // Construir objeto de atualização explicitamente
    const updateData: any = {}
    
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description ?? null
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId
    if (data.price !== undefined) updateData.price = data.price.toString()
    if (data.cost !== undefined) updateData.cost = data.cost.toString()
    if (data.barcode !== undefined) updateData.barcode = data.barcode || null
    if (data.sku !== undefined) updateData.sku = data.sku || null
    if (data.active !== undefined) updateData.active = data.active
    if (data.lowStockAlert !== undefined) updateData.lowStockAlert = data.lowStockAlert

    console.log('📝 Dados para atualização:', updateData)

    // Verificar se há dados para atualizar
    if (Object.keys(updateData).length === 0) {
      console.warn('⚠️ Nenhum campo para atualizar')
      // Retornar o produto atual sem atualizar
      const currentProduct = await prisma.product.findUnique({
        where: { id: params.id },
        include: {
          category: true,
          variations: true,
        },
      })
      if (!currentProduct) {
        return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
      }
      return NextResponse.json({ product: currentProduct })
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: updateData,
      include: {
        category: true,
        variations: true,
      },
    })

    console.log('✅ Produto atualizado com sucesso:', product.id)

    return NextResponse.json({ product })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map((e: { message?: string }) => e.message).filter(Boolean).join(', ') || 'Dados inválidos'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    // Verificar se é erro de constraint única
    if (error?.code === 'P2002') {
      const field = error?.meta?.target?.[0] || 'campo'
      console.error(`❌ Erro de constraint única no campo: ${field}`)
      return NextResponse.json({ 
        error: `${field === 'barcode' ? 'Código de barras' : field === 'sku' ? 'SKU' : field} já está em uso por outro produto`
      }, { status: 400 })
    }
    
    console.error('❌ Erro ao atualizar produto:', error)
    console.error('Stack:', error?.stack)
    console.error('Body recebido:', body)
    return NextResponse.json({ 
      error: 'Erro ao atualizar produto',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

async function deleteProduct(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { user } = req
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem excluir produtos.' }, { status: 403 })
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { _count: { select: { salesItems: true } } },
    })

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    if (product._count.salesItems > 0) {
      return NextResponse.json({
        error: `Não é possível excluir este produto. Ele está vinculado a ${product._count.salesItems} item(ns) de venda.`,
      }, { status: 400 })
    }

    await prisma.product.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Produto excluído com sucesso' })
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development' && error instanceof Error) {
      console.error('Erro ao excluir produto:', error)
    }
    return NextResponse.json({
      error: 'Erro ao excluir produto',
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined,
    }, { status: 500 })
  }
}

export const GET = withAuth(getProduct)
export const PUT = withAuth(updateProduct)
export const DELETE = withAuth(deleteProduct)
