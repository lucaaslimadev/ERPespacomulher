import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const fixedExpenseSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().positive(),
  category: z.string().min(1, 'Categoria é obrigatória'),
  dayOfMonth: z.number().int().min(1).max(31),
  observations: z.string().optional().nullable(),
  active: z.boolean().optional(),
})

async function getFixedExpenses(req: NextRequest) {
  try {
    const active = req.nextUrl.searchParams.get('active')

    const where: any = {}
    if (active !== null) {
      where.active = active === 'true'
    }

    const expenses = await prisma.fixedExpense.findMany({
      where,
      orderBy: { dayOfMonth: 'asc' },
    })

    return NextResponse.json({ expenses })
  } catch (error: any) {
    console.error('❌ Erro ao buscar despesas fixas:', error)
    return NextResponse.json({ 
      error: 'Erro ao buscar despesas fixas',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

async function createFixedExpense(req: AuthenticatedRequest) {
  try {
    const { user } = req
    if (!user || (user.role !== 'GERENTE' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const data = fixedExpenseSchema.parse(body)

    const expense = await prisma.fixedExpense.create({
      data: {
        description: data.description,
        amount: data.amount.toString(),
        category: data.category,
        dayOfMonth: data.dayOfMonth,
        observations: data.observations || null,
        active: data.active ?? true,
      },
    })

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('❌ Erro ao criar despesa fixa:', error)
    return NextResponse.json({ 
      error: 'Erro ao criar despesa fixa',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

export const GET = withAuth(getFixedExpenses)
export const POST = withAuth(createFixedExpense)
