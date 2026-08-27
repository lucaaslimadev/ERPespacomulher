import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { UserRole } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NotificationType } from '@prisma/client'
import { z } from 'zod'

const markAsReadSchema = z.object({
  id: z.string().cuid().optional(),
})

async function getNotifications(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const read = searchParams.get('read')
    const type = searchParams.get('type')

    const where: any = {}
    
    if (read !== null) {
      where.read = read === 'true'
    }
    
    if (type) {
      where.type = type as NotificationType
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const unreadCount = await prisma.notification.count({
      where: { read: false },
    })

    return NextResponse.json({ notifications, unreadCount })
  } catch (error: unknown) {
    console.error('Erro ao buscar notificações')
    return NextResponse.json({ 
      error: 'Erro ao buscar notificações',
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    }, { status: 500 })
  }
}

async function markAsRead(req: AuthenticatedRequest) {
  try {
    const body = await req.json()
    const { id } = markAsReadSchema.parse(body)

    if (id) {
      // Marcar uma notificação específica como lida
      await prisma.notification.update({
        where: { id },
        data: { read: true, readAt: new Date() },
      })
    } else {
      // Marcar todas como lidas
      await prisma.notification.updateMany({
        where: { read: false },
        data: { read: true, readAt: new Date() },
      })
    }

    return NextResponse.json({ message: 'Notificação marcada como lida' })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'ID de notificação inválido' }, { status: 400 })
    }
    console.error('Erro ao marcar notificação como lida')
    return NextResponse.json({ 
      error: 'Erro ao marcar notificação como lida',
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    }, { status: 500 })
  }
}

export const GET = withAuth(getNotifications, UserRole.GERENTE)
export const POST = withAuth(markAsRead, UserRole.GERENTE)
