import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/db'

async function handler(req: NextRequest) {
  try {
    const { user } = req as any
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
      },
    })

    if (!dbUser || !dbUser.active) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ user: dbUser })
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return NextResponse.json({ error: 'Erro ao buscar usuário' }, { status: 500 })
  }
}

export const GET = withAuth(handler)
