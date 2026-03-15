import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const accountPayableSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  supplierId: z.union([z.string(), z.null()]).optional().transform(v => (v == null || String(v).trim() === '') ? null : String(v).trim()),
  supplier: z.union([z.string(), z.null()]).optional(),
  amount: z.number().positive('Valor deve ser maior que zero'),
  dueDate: z.string().min(1, 'Data de vencimento é obrigatória'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  observations: z.union([z.string(), z.null()]).optional().transform(v => (v == null || String(v).trim() === '') ? null : String(v).trim()),
})

async function getAccountsPayable(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const paid = searchParams.get('paid')

    const where: any = {}

    if (startDate || endDate) {
      where.dueDate = {}
      if (startDate) {
        const start = new Date(startDate)
        if (isNaN(start.getTime())) {
          return NextResponse.json({ error: 'Data inicial inválida' }, { status: 400 })
        }
        start.setHours(0, 0, 0, 0)
        where.dueDate.gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        if (isNaN(end.getTime())) {
          return NextResponse.json({ error: 'Data final inválida' }, { status: 400 })
        }
        end.setHours(23, 59, 59, 999)
        where.dueDate.lte = end
      }
    }
    
    if (paid !== null) {
      where.paid = paid === 'true'
    }

    const accounts = await prisma.accountsPayable.findMany({
      where,
      include: {
        supplier: true,
      },
      orderBy: { dueDate: 'asc' },
    })

    return NextResponse.json({ accounts })
  } catch (error: any) {
    console.error('❌ Erro ao buscar contas a pagar:', error)
    return NextResponse.json({ 
      error: 'Erro ao buscar contas a pagar',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

async function createAccountPayable(req: AuthenticatedRequest) {
  try {
    const { user } = req
    if (!user || (user.role !== 'GERENTE' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const data = accountPayableSchema.parse(body)

    // Corrigir timezone: garantir que a data seja tratada como data local (meio-dia)
    const dueDateStr = String(data.dueDate).trim()
    const parts = dueDateStr.split('-').map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) {
      return NextResponse.json({ error: 'Data de vencimento inválida. Use o formato AAAA-MM-DD.' }, { status: 400 })
    }
    const [year, month, day] = parts
    const dueDate = new Date(year, month - 1, day, 12, 0, 0, 0)
    if (isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: 'Data de vencimento inválida.' }, { status: 400 })
    }

    const account = await prisma.accountsPayable.create({
      data: {
        description: data.description.trim(),
        supplierId: data.supplierId ?? null,
        amount: data.amount.toString(),
        dueDate: dueDate,
        category: data.category.trim(),
        observations: data.observations ?? null,
      },
      include: {
        supplier: true,
      },
    })

    return NextResponse.json({ account }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map((e) => e.message).filter(Boolean).join('; ') || 'Dados inválidos'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error('❌ Erro ao criar conta a pagar:', error)
    return NextResponse.json({ 
      error: 'Erro ao criar conta a pagar',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

export const GET = withAuth(getAccountsPayable)
export const POST = withAuth(createAccountPayable)
