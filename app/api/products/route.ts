import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const productSchema = z.object({
  name: z.string().min(1, 'Nome do produto é obrigatório'),
  description: z.string().optional(),
  categoryId: z.string().optional(), // se vazio, API usa categoria "Geral"
  price: z.number().positive(),
  cost: z.number().nonnegative(),
  barcode: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  lowStockAlert: z.number().int().nonnegative().default(5),
})

async function getProducts(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const categoryId = searchParams.get('categoryId')
    const active = searchParams.get('active')

    const where: any = {}
    
    if (search) {
      // Usar ilike para PostgreSQL (case-insensitive)
      where.OR = [
        { name: { contains: search } },
        { barcode: { contains: search } },
        { sku: { contains: search } },
      ]
    }
    
    if (categoryId) {
      where.categoryId = categoryId
    }
    
    if (active === 'true' || active === 'false') {
      where.active = active === 'true'
    }

    const MAX_PRODUCTS_LIST = 2000
    const products = await prisma.product.findMany({
      where,
      take: MAX_PRODUCTS_LIST,
      include: {
        category: true,
        variations: {
          orderBy: [{ color: 'asc' }, { size: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ products })
  } catch (error: any) {
    console.error('❌ Erro ao buscar produtos:', error)
    console.error('Stack:', error?.stack)
    return NextResponse.json({ 
      error: 'Erro ao buscar produtos',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

async function getOrCreateGeralCategory(): Promise<string> {
  let category = await prisma.category.findFirst({
    where: { name: 'Geral', active: true },
  })
  if (!category) {
    category = await prisma.category.create({
      data: { name: 'Geral' },
    })
  }
  return category.id
}

async function createProduct(req: AuthenticatedRequest) {
  let body: unknown = null
  try {
    const { user } = req
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    body = await req.json()
    const parsed = productSchema.safeParse(body)
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).filter(Boolean).join(', ') || 'Dados inválidos'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    const data = parsed.data

    // Garantir que a categoria existe; se vazia ou inexistente, usar "Geral"
    let categoryId = (data.categoryId || '').trim()
    if (categoryId) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: categoryId },
      })
      if (!categoryExists) categoryId = ''
    }
    if (!categoryId) {
      categoryId = await getOrCreateGeralCategory()
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description || null,
        categoryId,
        price: data.price.toString(),
        cost: data.cost.toString(),
        barcode: data.barcode || null,
        sku: data.sku || null,
        lowStockAlert: data.lowStockAlert ?? 5,
      },
      include: {
        category: true,
        variations: true,
      },
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map((e: { message?: string }) => e.message).filter(Boolean).join(', ') || 'Dados inválidos'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    if (error?.code === 'P2002') {
      const field = error?.meta?.target?.[0] ?? 'campo'
      return NextResponse.json({
        error: field === 'barcode' ? 'Código de barras já em uso' : field === 'sku' ? 'SKU já em uso' : 'Dados duplicados',
      }, { status: 400 })
    }
    console.error('❌ Erro ao criar produto:', error)
    console.error('Stack:', error?.stack)
    if (body) console.error('Body recebido:', body)
    return NextResponse.json({
      error: 'Erro ao criar produto',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
    }, { status: 500 })
  }
}

export const GET = withAuth(getProducts)
export const POST = withAuth(createProduct)
