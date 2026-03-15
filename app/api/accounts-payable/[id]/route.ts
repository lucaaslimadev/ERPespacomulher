import { NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { FinancialType } from '@prisma/client'

async function updateAccountPayable(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { user } = req
    if (!user || (user.role !== 'GERENTE' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const { paid, paidAmount } = body

    const account = await prisma.accountsPayable.findUnique({
      where: { id: params.id },
    })

    if (!account) {
      return NextResponse.json({ error: 'Conta a pagar não encontrada' }, { status: 404 })
    }

    const amountNum = parseFloat(account.amount.toString())
    let paidAmountToUse = amountNum
    if (paid === true && paidAmount != null) {
      const requested = Number(paidAmount)
      if (!Number.isFinite(requested) || requested <= 0) {
        return NextResponse.json({ error: 'Valor pago deve ser maior que zero' }, { status: 400 })
      }
      if (requested > amountNum) {
        return NextResponse.json({ error: 'Valor pago não pode ser maior que o valor da conta' }, { status: 400 })
      }
      paidAmountToUse = requested
    }

    const paidAmountStr = paidAmountToUse.toFixed(2)

    if (paid !== true && paid !== false) {
      return NextResponse.json({ error: 'Informe paid (true ou false)' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      if (paid === true) {
        await tx.financialTransaction.create({
          data: {
            type: FinancialType.SAIDA,
            category: account.category,
            description: `Pagamento: ${account.description}`,
            amount: paidAmountStr,
            date: new Date(),
            accountPayableId: account.id,
          },
        })
      }
      await tx.accountsPayable.update({
        where: { id: params.id },
        data: paid === true
          ? { paid: true, paidAt: new Date(), paidAmount: paidAmountStr }
          : { paid: false, paidAt: null, paidAmount: '0' },
      })
    })

    const updatedAccount = await prisma.accountsPayable.findUnique({
      where: { id: params.id },
      include: { supplier: true },
    })
    return NextResponse.json({ account: updatedAccount })
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development' && error instanceof Error) {
      console.error('Erro ao atualizar conta a pagar:', error)
    }
    return NextResponse.json({
      error: 'Erro ao atualizar conta a pagar',
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined,
    }, { status: 500 })
  }
}

async function deleteAccountPayable(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { user } = req
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    await prisma.accountsPayable.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Conta a pagar excluída com sucesso' })
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development' && error instanceof Error) {
      console.error('Erro ao excluir conta a pagar:', error)
    }
    return NextResponse.json({
      error: 'Erro ao excluir conta a pagar',
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined,
    }, { status: 500 })
  }
}

export const PUT = withAuth(updateAccountPayable)
export const DELETE = withAuth(deleteAccountPayable)
