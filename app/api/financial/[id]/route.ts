import { NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'

async function deleteTransaction(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { user } = req
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (user.role === 'CAIXA') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const transaction = await prisma.financialTransaction.findUnique({
      where: { id: params.id },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 })
    }

    // Verificar se a transação está vinculada a contas a pagar ou receber
    if (transaction.accountPayableId || transaction.accountReceivableId) {
      return NextResponse.json({
        error: 'Não é possível excluir: esta transação está vinculada a uma conta a pagar/receber',
      }, { status: 400 })
    }

    await prisma.financialTransaction.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Transação excluída com sucesso' })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao excluir transação:', error)
    }
    return NextResponse.json({ error: 'Erro ao excluir transação' }, { status: 500 })
  }
}

export const DELETE = withAuth(deleteTransaction)
