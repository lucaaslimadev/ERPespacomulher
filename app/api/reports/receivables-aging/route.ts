import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { UserRole } from '@/lib/auth'
import { prisma } from '@/lib/db'

function getBucket(daysOverdue: number): 'current' | '0-30' | '31-60' | '61-90' | '90+' {
  if (daysOverdue <= 0) return 'current'
  if (daysOverdue <= 30) return '0-30'
  if (daysOverdue <= 60) return '31-60'
  if (daysOverdue <= 90) return '61-90'
  return '90+'
}

async function getReceivablesAging(_req: NextRequest) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [openAccounts, paidAccounts] = await Promise.all([
      prisma.accountsReceivable.findMany({
        where: { received: false },
        include: { customer: { select: { id: true, name: true } } },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.accountsReceivable.findMany({
        where: {
          received: true,
          receivedAt: { not: null },
        },
        select: { id: true, amount: true, dueDate: true, receivedAt: true },
      }),
    ])

    const buckets = {
      current: 0,
      '0-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0,
    }

    const detailed = openAccounts.map((account) => {
      const dueDate = new Date(account.dueDate)
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000))
      const openAmount = Math.max(0, Number(account.amount) - Number(account.receivedAmount))
      const bucket = getBucket(daysOverdue)
      buckets[bucket] += openAmount

      return {
        id: account.id,
        customer: account.customer?.name || 'Sem cliente',
        dueDate: account.dueDate,
        amount: Number(account.amount),
        openAmount,
        daysOverdue: Math.max(0, daysOverdue),
        bucket,
      }
    })

    const totalOpen = detailed.reduce((sum, d) => sum + d.openAmount, 0)
    const overdue = detailed.filter((d) => d.daysOverdue > 0)
    const overdueOpen = overdue.reduce((sum, d) => sum + d.openAmount, 0)
    const overdueRate = totalOpen > 0 ? (overdueOpen / totalOpen) * 100 : 0

    const recoveredOverdue = paidAccounts.filter((a) => {
      if (!a.receivedAt) return false
      return new Date(a.receivedAt).getTime() > new Date(a.dueDate).getTime()
    }).length
    const totalPaid = paidAccounts.length
    const recoveryRate = totalPaid > 0 ? (recoveredOverdue / totalPaid) * 100 : 0

    const byCustomer = detailed.reduce<Record<string, { customer: string; openAmount: number; overdueAmount: number }>>(
      (acc, row) => {
        if (!acc[row.customer]) {
          acc[row.customer] = { customer: row.customer, openAmount: 0, overdueAmount: 0 }
        }
        acc[row.customer].openAmount += row.openAmount
        if (row.daysOverdue > 0) acc[row.customer].overdueAmount += row.openAmount
        return acc
      },
      {}
    )

    return NextResponse.json({
      summary: {
        totalOpen,
        overdueOpen,
        overdueRate,
        recoveryRate,
        totalTitles: detailed.length,
      },
      buckets,
      bucketShare: {
        current: totalOpen > 0 ? (buckets.current / totalOpen) * 100 : 0,
        '0-30': totalOpen > 0 ? (buckets['0-30'] / totalOpen) * 100 : 0,
        '31-60': totalOpen > 0 ? (buckets['31-60'] / totalOpen) * 100 : 0,
        '61-90': totalOpen > 0 ? (buckets['61-90'] / totalOpen) * 100 : 0,
        '90+': totalOpen > 0 ? (buckets['90+'] / totalOpen) * 100 : 0,
      },
      byCustomer: Object.values(byCustomer)
        .sort((a, b) => b.overdueAmount - a.overdueAmount)
        .slice(0, 20),
      details: detailed,
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao gerar aging de recebíveis' }, { status: 500 })
  }
}

export const GET = withAuth(getReceivablesAging, UserRole.GERENTE)
