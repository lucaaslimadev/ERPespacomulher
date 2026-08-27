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

    const idempotencyKey = req.headers.get('x-idempotency-key')?.trim().slice(0, 64) || null
    const account = await prisma.accountsReceivable.findUnique({ where: { id: params.id } })

    if (!account) {
      return NextResponse.json({ error: 'Conta a receber não encontrada' }, { status: 404 })
    }

    const amountNum = parseFloat(account.amount.toString())
    let amountPaidToUse = 0

    if (received === true && receivedAmount != null) {
      const requested = Number(receivedAmount)
      if (!Number.isFinite(requested) || requested <= 0) {
        return NextResponse.json({ error: 'Valor recebido deve ser maior que zero' }, { status: 400 })
      }
      amountPaidToUse = requested
    }

    if (received !== true && received !== false) {
      return NextResponse.json({ error: 'Informe received (true ou false)' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      const current = await tx.accountsReceivable.findUnique({ where: { id: params.id } })
      if (!current) {
        throw new Error('Conta a receber não encontrada')
      }

      const currentTotal = parseFloat(current.receivedAmount.toString())
      const total = parseFloat(current.amount.toString())
      const effectiveAmountToUse = received === true
        ? (amountPaidToUse > 0 ? amountPaidToUse : total - currentTotal)
        : 0

      if (received === true && (effectiveAmountToUse <= 0 || currentTotal + effectiveAmountToUse > total)) {
        throw new Error('Valor recebido ultrapassa o total da conta')
      }

      const newReceivedTotal = currentTotal + effectiveAmountToUse
      const isFullyPaid = newReceivedTotal >= total

      if (received === true && effectiveAmountToUse > 0) {
        const idemTag = idempotencyKey ? ` [idempotency:${idempotencyKey}]` : ''
        const existingTx = await tx.financialTransaction.findFirst({
          where: {
            accountReceivableId: current.id,
            type: FinancialType.ENTRADA,
            ...(idempotencyKey
              ? { description: { contains: `[idempotency:${idempotencyKey}]` } }
              : {}),
          },
          select: { id: true },
        })
        if (existingTx) {
          return
        }

        await tx.financialTransaction.create({
          data: {
            type: FinancialType.ENTRADA,
            category: current.category,
            description: `Recebimento Crediário: ${current.description}${idemTag}`,
            amount: effectiveAmountToUse.toFixed(2),
            date: new Date(),
            accountReceivableId: current.id,
          },
        })
        
        if (isFullyPaid) {
          // Remover notificações relacionadas quando marcar como recebida totalmente
          await tx.notification.deleteMany({
            where: { relatedId: params.id },
          })
        }
      }
      
      await tx.accountsReceivable.update({
        where: { id: params.id },
        data: received === true
          ? { 
              received: isFullyPaid, 
              receivedAt: isFullyPaid ? new Date() : current.receivedAt, 
              receivedAmount: newReceivedTotal.toFixed(2) 
            }
          : { received: false, receivedAt: null, receivedAmount: '0' },
      })

      if (received === false) {
        await tx.financialTransaction.deleteMany({
          where: {
            accountReceivableId: params.id,
            type: FinancialType.ENTRADA,
          },
        })
      }
    })

    const updatedAccount = await prisma.accountsReceivable.findUnique({
      where: { id: params.id },
      include: { customer: true },
    })
    return NextResponse.json({ account: updatedAccount })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Conta a receber não encontrada') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof Error && error.message === 'Valor recebido ultrapassa o total da conta') {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
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

    await prisma.$transaction(async (tx) => {
      // Excluir notificações relacionadas primeiro
      await tx.notification.deleteMany({
        where: { relatedId: params.id },
      })

      // Excluir a conta a receber
      await tx.accountsReceivable.delete({
        where: { id: params.id },
      })
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
