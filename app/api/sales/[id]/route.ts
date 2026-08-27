import { NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { StockType } from '@prisma/client'

async function deleteSale(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { user } = req
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem excluir vendas.' }, { status: 403 })
    }

    const sale = await prisma.sale.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { variation: true } },
        accountsReceivable: true,
        payments: true,
        installments: true,
        discountLogs: true,
        cancellationLogs: true,
      },
    })

    if (!sale) {
      return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 })
    }

    // Verificar se há contas a receber já recebidas
    const receivedAccounts = sale.accountsReceivable.filter(acc => acc.received)
    if (receivedAccounts.length > 0) {
      return NextResponse.json({
        error: 'Não é possível excluir: esta venda possui parcelas já recebidas.',
      }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      // 1. Devolver estoque (se a venda não estava cancelada)
      if (!sale.cancelled) {
        for (const item of sale.items) {
          await tx.productVariation.update({
            where: { id: item.variationId },
            data: { quantity: { increment: item.quantity } },
          })
          await tx.stockLog.create({
            data: {
              productId: item.productId,
              variationId: item.variationId,
              userId: user.userId,
              type: StockType.ENTRADA_DEVOLUCAO,
              quantity: item.quantity,
              reason: `Exclusão da venda #${sale.id}`,
            },
          })
        }
      }

      // 2. Excluir transações financeiras vinculadas à venda
      await tx.financialTransaction.deleteMany({
        where: {
          description: {
            contains: `Venda #${sale.id.substring(0, 8)}`,
          },
        },
      })

      // 3. Excluir contas a receber vinculadas
      await tx.accountsReceivable.deleteMany({
        where: { saleId: params.id },
      })

      // 4. Excluir logs de desconto
      await tx.discountLog.deleteMany({
        where: { saleId: params.id },
      })

      // 5. Excluir logs de cancelamento
      await tx.cancellationLog.deleteMany({
        where: { saleId: params.id },
      })

      // 6. Excluir parcelas
      await tx.saleInstallment.deleteMany({
        where: { saleId: params.id },
      })

      // 7. Excluir pagamentos
      await tx.salePayment.deleteMany({
        where: { saleId: params.id },
      })

      // 8. Excluir itens da venda
      await tx.saleItem.deleteMany({
        where: { saleId: params.id },
      })

      // 9. Excluir a venda
      await tx.sale.delete({
        where: { id: params.id },
      })
    })

    return NextResponse.json({ message: 'Venda excluída com sucesso' })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao excluir venda:', error)
    }
    return NextResponse.json({ error: 'Erro ao excluir venda' }, { status: 500 })
  }
}

export const DELETE = withAuth(deleteSale)
