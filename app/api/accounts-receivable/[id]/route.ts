import { NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { FinancialType } from '@prisma/client'

async function updateAccountReceivable(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { user } = req
    if (!user || (user.role !== 'GERENTE' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const { received, receivedAmount } = body

    const account = await prisma.accountsReceivable.findUnique({
      where: { id: params.id },
    })

    if (!account) {
      return NextResponse.json({ error: 'Conta a receber não encontrada' }, { status: 404 })
    }

    const amountNum = parseFloat(account.amount.toString())
    let receivedAmountToUse = amountNum
    if (received === true && receivedAmount != null) {
      const requested = Number(receivedAmount)
      if (!Number.isFinite(requested) || requested <= 0) {
        return NextResponse.json({ error: 'Valor recebido deve ser maior que zero' }, { status: 400 })
      }
      if (requested > amountNum) {
        return NextResponse.json({ error: 'Valor recebido não pode ser maior que o valor da conta' }, { status: 400 })
      }
      receivedAmountToUse = requested
    }

    const receivedAmountStr = receivedAmountToUse.toFixed(2)

    if (received !== true && received !== false) {
      return NextResponse.json({ error: 'Informe received (true ou false)' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      if (received === true) {
        await tx.financialTransaction.create({
          data: {
            type: FinancialType.ENTRADA,
            category: account.category,
            description: `Recebimento: ${account.description}`,
            amount: receivedAmountStr,
            date: new Date(),
            accountReceivableId: account.id,
          },
        })
      }
      await tx.accountsReceivable.update({
        where: { id: params.id },
        data: received === true
          ? { received: true, receivedAt: new Date(), receivedAmount: receivedAmountStr }
          : { received: false, receivedAt: null, receivedAmount: '0' },
      })
    })

    const updatedAccount = await prisma.accountsReceivable.findUnique({
      where: { id: params.id },
      include: { customer: true },
    })
    return NextResponse.json({ account: updatedAccount })
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development' && error instanceof Error) {
      console.error('Erro ao atualizar conta a receber:', error)
    }
    return NextResponse.json({
      error: 'Erro ao atualizar conta a receber',
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined,
    }, { status: 500 })
  }
}

async function deleteAccountReceivable(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { user } = req
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    await prisma.accountsReceivable.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Conta a receber excluída com sucesso' })
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development' && error instanceof Error) {
      console.error('Erro ao excluir conta a receber:', error)
    }
    return NextResponse.json({
      error: 'Erro ao excluir conta a receber',
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined,
    }, { status: 500 })
  }
}

export const PUT = withAuth(updateAccountReceivable)
export const DELETE = withAuth(deleteAccountReceivable)
