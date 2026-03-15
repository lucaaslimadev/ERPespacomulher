import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { NotificationType } from '@prisma/client'

async function checkNotifications(req: NextRequest) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const in3Days = new Date(today)
    in3Days.setDate(in3Days.getDate() + 3)

    // Verificar contas a pagar vencendo hoje
    const accountsPayableDueToday = await prisma.accountsPayable.findMany({
      where: {
        paid: false,
        dueDate: {
          gte: today,
          lt: tomorrow,
        },
      },
    })

    // Verificar contas a pagar vencendo em 3 dias
    const accountsPayableDueSoon = await prisma.accountsPayable.findMany({
      where: {
        paid: false,
        dueDate: {
          gte: tomorrow,
          lte: in3Days,
        },
      },
    })

    // Verificar contas a receber vencendo hoje
    const accountsReceivableDueToday = await prisma.accountsReceivable.findMany({
      where: {
        received: false,
        dueDate: {
          gte: today,
          lt: tomorrow,
        },
      },
    })

    // Verificar contas a receber vencendo em 3 dias
    const accountsReceivableDueSoon = await prisma.accountsReceivable.findMany({
      where: {
        received: false,
        dueDate: {
          gte: tomorrow,
          lte: in3Days,
        },
      },
    })

    // Verificar despesas fixas vencendo hoje
    const todayDay = today.getDate()
    const fixedExpensesDueToday = await prisma.fixedExpense.findMany({
      where: {
        active: true,
        dayOfMonth: todayDay,
      },
    })

    // Verificar despesas fixas vencendo em 3 dias
    const fixedExpensesDueSoon = await prisma.fixedExpense.findMany({
      where: {
        active: true,
        dayOfMonth: {
          gte: todayDay + 1,
          lte: Math.min(todayDay + 3, 31),
        },
      },
    })

    // Criar notificações
    const notifications = []

    // Contas a pagar vencendo hoje
    for (const account of accountsPayableDueToday) {
      const existing = await prisma.notification.findFirst({
        where: {
          type: NotificationType.ACCOUNT_PAYABLE_DUE,
          relatedId: account.id,
          read: false,
        },
      })
      
      if (!existing) {
        notifications.push({
          type: NotificationType.ACCOUNT_PAYABLE_DUE,
          title: 'Conta a Pagar Vencendo Hoje',
          message: `${account.description} - ${account.amount} vence hoje`,
          relatedId: account.id,
        })
      }
    }

    // Contas a pagar vencendo em breve
    for (const account of accountsPayableDueSoon) {
      const existing = await prisma.notification.findFirst({
        where: {
          type: NotificationType.ACCOUNT_PAYABLE_DUE_SOON,
          relatedId: account.id,
          read: false,
        },
      })
      
      if (!existing) {
        const daysUntilDue = Math.ceil((account.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        notifications.push({
          type: NotificationType.ACCOUNT_PAYABLE_DUE_SOON,
          title: 'Conta a Pagar Vencendo em Breve',
          message: `${account.description} - ${account.amount} vence em ${daysUntilDue} dia(s)`,
          relatedId: account.id,
        })
      }
    }

    // Contas a receber vencendo hoje
    for (const account of accountsReceivableDueToday) {
      const existing = await prisma.notification.findFirst({
        where: {
          type: NotificationType.ACCOUNT_RECEIVABLE_DUE,
          relatedId: account.id,
          read: false,
        },
      })
      
      if (!existing) {
        notifications.push({
          type: NotificationType.ACCOUNT_RECEIVABLE_DUE,
          title: 'Conta a Receber Vencendo Hoje',
          message: `${account.description} - ${account.amount} vence hoje`,
          relatedId: account.id,
        })
      }
    }

    // Contas a receber vencendo em breve
    for (const account of accountsReceivableDueSoon) {
      const existing = await prisma.notification.findFirst({
        where: {
          type: NotificationType.ACCOUNT_RECEIVABLE_DUE_SOON,
          relatedId: account.id,
          read: false,
        },
      })
      
      if (!existing) {
        const daysUntilDue = Math.ceil((account.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        notifications.push({
          type: NotificationType.ACCOUNT_RECEIVABLE_DUE_SOON,
          title: 'Conta a Receber Vencendo em Breve',
          message: `${account.description} - ${account.amount} vence em ${daysUntilDue} dia(s)`,
          relatedId: account.id,
        })
      }
    }

    // Despesas fixas vencendo hoje
    for (const expense of fixedExpensesDueToday) {
      const existing = await prisma.notification.findFirst({
        where: {
          type: NotificationType.FIXED_EXPENSE_DUE,
          relatedId: expense.id,
          read: false,
          createdAt: {
            gte: today,
          },
        },
      })
      
      if (!existing) {
        notifications.push({
          type: NotificationType.FIXED_EXPENSE_DUE,
          title: 'Despesa Fixa Vencendo Hoje',
          message: `${expense.description} - ${expense.amount} vence hoje`,
          relatedId: expense.id,
        })
      }
    }

    // Despesas fixas vencendo em breve
    for (const expense of fixedExpensesDueSoon) {
      const existing = await prisma.notification.findFirst({
        where: {
          type: NotificationType.FIXED_EXPENSE_DUE_SOON,
          relatedId: expense.id,
          read: false,
        },
      })
      
      if (!existing) {
        const daysUntilDue = expense.dayOfMonth - todayDay
        notifications.push({
          type: NotificationType.FIXED_EXPENSE_DUE_SOON,
          title: 'Despesa Fixa Vencendo em Breve',
          message: `${expense.description} - ${expense.amount} vence em ${daysUntilDue} dia(s)`,
          relatedId: expense.id,
        })
      }
    }

    // Criar todas as notificações
    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications,
      })
    }

    return NextResponse.json({ 
      created: notifications.length,
      notifications 
    })
  } catch (error: any) {
    console.error('❌ Erro ao verificar notificações:', error)
    return NextResponse.json({ 
      error: 'Erro ao verificar notificações',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

export const GET = withAuth(checkNotifications)
