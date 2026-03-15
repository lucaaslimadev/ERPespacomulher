import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const categorySchema = z.object({
  name: z.string().min(1, 'Nome da categoria é obrigatório'),
})

async function getCategories(req: NextRequest) {
  try {
    const categories = await prisma.category.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Erro ao buscar categorias:', error)
    return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 })
  }
}

async function createCategory(req: AuthenticatedRequest) {
  try {
    const { user } = req
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const data = categorySchema.parse(body)

    const category = await prisma.category.create({
      data,
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Erro ao criar categoria:', error)
    return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 })
  }
}

export const GET = withAuth(getCategories)
export const POST = withAuth(createCategory)
