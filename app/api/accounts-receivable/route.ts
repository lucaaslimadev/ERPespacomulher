import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const accountReceivableSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  customerId: z.string().optional().nullable(),
  amount: z.number().positive(),
  dueDate: z.string(),
  category: z.string().min(1, 'Categoria é obrigatória'),
  observations: z.string().optional().nullable(),
})

async function getAccountsReceivable(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const received = searchParams.get('received')

    const where: any = {}
    
    if (startDate || endDate) {
      where.dueDate = {}
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        where.dueDate.gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.dueDate.lte = end
      }
    }
    
    if (received !== null) {
      where.received = received === 'true'
    }

    const accounts = await prisma.accountsReceivable.findMany({
      where,
      include: {
        customer: true,
      },
      orderBy: { dueDate: 'asc' },
    })

    return NextResponse.json({ accounts })
  } catch (error: any) {
    console.error('❌ Erro ao buscar contas a receber:', error)
    return NextResponse.json({ 
      error: 'Erro ao buscar contas a receber',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

async function createAccountReceivable(req: AuthenticatedRequest) {
  try {
    const { user } = req
    if (!user || (user.role !== 'GERENTE' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const data = accountReceivableSchema.parse(body)

    // Corrigir timezone: garantir que a data seja tratada como data local (meio-dia)
    const dueDateStr = data.dueDate
    const [year, month, day] = dueDateStr.split('-').map(Number)
    const dueDate = new Date(year, month - 1, day, 12, 0, 0, 0) // Meio-dia para evitar problemas de timezone

    const account = await prisma.accountsReceivable.create({
      data: {
        description: data.description,
        customerId: data.customerId || null,
        amount: data.amount.toString(),
        dueDate: dueDate,
        category: data.category,
        observations: data.observations || null,
      },
      include: {
        customer: true,
      },
    })

    return NextResponse.json({ account }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('❌ Erro ao criar conta a receber:', error)
    return NextResponse.json({ 
      error: 'Erro ao criar conta a receber',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

export const GET = withAuth(getAccountsReceivable)
export const POST = withAuth(createAccountReceivable)
