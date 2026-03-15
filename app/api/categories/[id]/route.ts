import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const categoryUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  active: z.boolean().optional(),
})

async function updateCategory(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { user } = req
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const data = categoryUpdateSchema.parse(body)

    const category = await prisma.category.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json({ category })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('❌ Erro ao atualizar categoria:', error)
    return NextResponse.json({ 
      error: 'Erro ao atualizar categoria',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

async function deleteCategory(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { user } = req
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Verificar se há produtos usando esta categoria
    const productsCount = await prisma.product.count({
      where: { categoryId: params.id },
    })

    if (productsCount > 0) {
      return NextResponse.json({ 
        error: `Não é possível excluir esta categoria. Ela está sendo usada por ${productsCount} produto(s).` 
      }, { status: 400 })
    }

    await prisma.category.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Categoria excluída com sucesso' })
  } catch (error: any) {
    console.error('❌ Erro ao excluir categoria:', error)
    return NextResponse.json({ 
      error: 'Erro ao excluir categoria',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

export const PUT = withAuth(updateCategory)
export const DELETE = withAuth(deleteCategory)
