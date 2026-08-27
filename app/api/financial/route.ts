import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { UserRole } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { FinancialType } from '@prisma/client'

const transactionSchema = z.object({
  type: z.nativeEnum(FinancialType),
  category: z.string().min(1, 'Categoria é obrigatória'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.number().positive(),
  date: z.string().optional(),
})

function parseOptionalDate(value: string | null): Date | null {
  if (!value || !value.trim()) return null
  // YYYY-MM-DD como meia-noite local para bater com transações criadas no mesmo dia
  const d = new Date(value.includes('T') ? value : value + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

async function getTransactions(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type')

    const dateStart = startDate ? parseOptionalDate(startDate) : null
    const dateEnd = endDate ? parseOptionalDate(endDate) : null
    if (startDate && !dateStart) {
      return NextResponse.json({ error: 'Data inicial inválida' }, { status: 400 })
    }
    if (endDate && !dateEnd) {
      return NextResponse.json({ error: 'Data final inválida' }, { status: 400 })
    }
    if (dateEnd) dateEnd.setHours(23, 59, 59, 999)

    const whereEntradas: { type: 'ENTRADA'; date?: { gte?: Date; lte?: Date } } = { type: FinancialType.ENTRADA }
    if (dateStart || dateEnd) {
      whereEntradas.date = {}
      if (dateStart) whereEntradas.date.gte = dateStart
      if (dateEnd) whereEntradas.date.lte = dateEnd
    }
    const entradasManuais = await prisma.financialTransaction.findMany({
      where: whereEntradas,
      orderBy: { date: 'desc' },
      take: 500,
    })
    const totalEntradasManuais = entradasManuais.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)

    const whereSaidas: { type: 'SAIDA'; date?: { gte?: Date; lte?: Date } } = { type: FinancialType.SAIDA }
    if (dateStart || dateEnd) {
      whereSaidas.date = {}
      if (dateStart) whereSaidas.date.gte = dateStart
      if (dateEnd) whereSaidas.date.lte = dateEnd
    }
    const saidasTransactions = await prisma.financialTransaction.findMany({
      where: whereSaidas,
      orderBy: { date: 'desc' },
      take: 500,
    })
    const totalSaidas = saidasTransactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)

    const entradasManuaisAsList = entradasManuais.map(t => ({
      id: t.id,
      type: FinancialType.ENTRADA,
      category: t.category,
      description: t.description,
      amount: t.amount.toString(),
      date: t.date,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }))
    const saidasAsList = saidasTransactions.map(t => ({
      ...t,
      amount: t.amount.toString(),
    }))

    let transactions = [...entradasManuaisAsList, ...saidasAsList].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    if (type) {
      const typeFilter = type as FinancialType
      transactions = transactions.filter(t => t.type === typeFilter)
    }

    return NextResponse.json({
      transactions,
      summary: {
        totalEntradas: totalEntradasManuais,
        totalSaidas,
        resultado: totalEntradasManuais - totalSaidas,
      },
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao buscar transações:', error)
    }
    return NextResponse.json({ error: 'Erro ao buscar transações' }, { status: 500 })
  }
}

async function createTransaction(req: AuthenticatedRequest) {
  try {
    const { user } = req
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (user.role === 'CAIXA') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const data = transactionSchema.parse(body)

    // Data no início do dia (local) para bater com o filtro do período
    const transactionDate = data.date
      ? (data.date.includes('T') ? new Date(data.date) : new Date(data.date + 'T00:00:00'))
      : new Date()

    const transaction = await prisma.financialTransaction.create({
      data: {
        type: data.type,
        category: data.category,
        description: data.description,
        amount: data.amount.toString(),
        date: transactionDate,
      },
    })

    return NextResponse.json({ transaction }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => e.message).filter(Boolean).join('; ') || 'Dados inválidos'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao criar transação:', error)
    }
    return NextResponse.json({ error: 'Erro ao criar transação' }, { status: 500 })
  }
}

export const GET = withAuth(getTransactions, UserRole.GERENTE)
export const POST = withAuth(createTransaction, UserRole.GERENTE)
