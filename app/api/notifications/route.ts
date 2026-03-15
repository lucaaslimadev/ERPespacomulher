import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { NotificationType } from '@prisma/client'

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
  } catch (error: any) {
    console.error('❌ Erro ao buscar notificações:', error)
    return NextResponse.json({ 
      error: 'Erro ao buscar notificações',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

async function markAsRead(req: AuthenticatedRequest) {
  try {
    const body = await req.json()
    const { id } = body

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
  } catch (error: any) {
    console.error('❌ Erro ao marcar notificação como lida:', error)
    return NextResponse.json({ 
      error: 'Erro ao marcar notificação como lida',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

export const GET = withAuth(getNotifications)
export const POST = withAuth(markAsRead)
