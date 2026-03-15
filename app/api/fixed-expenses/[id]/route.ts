import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const fixedExpenseUpdateSchema = z.object({
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  category: z.string().min(1).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  observations: z.string().optional().nullable(),
  active: z.boolean().optional(),
})

async function updateFixedExpense(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { user } = req
    if (!user || (user.role !== 'GERENTE' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const data = fixedExpenseUpdateSchema.parse(body)

    const updateData: any = {}
    if (data.description !== undefined) updateData.description = data.description
    if (data.amount !== undefined) updateData.amount = data.amount.toString()
    if (data.category !== undefined) updateData.category = data.category
    if (data.dayOfMonth !== undefined) updateData.dayOfMonth = data.dayOfMonth
    if (data.observations !== undefined) updateData.observations = data.observations ?? null
    if (data.active !== undefined) updateData.active = data.active

    const expense = await prisma.fixedExpense.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ expense })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('❌ Erro ao atualizar despesa fixa:', error)
    return NextResponse.json({ 
      error: 'Erro ao atualizar despesa fixa',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

async function deleteFixedExpense(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { user } = req
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    await prisma.fixedExpense.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Despesa fixa excluída com sucesso' })
  } catch (error: any) {
    console.error('❌ Erro ao excluir despesa fixa:', error)
    return NextResponse.json({ 
      error: 'Erro ao excluir despesa fixa',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

export const PUT = withAuth(updateFixedExpense)
export const DELETE = withAuth(deleteFixedExpense)
