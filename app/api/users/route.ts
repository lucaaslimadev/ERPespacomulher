import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { hashPassword } from '@/lib/auth'
import { UserRole } from '@prisma/client'

const userSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  username: z.string().min(3, 'Usuário deve ter no mínimo 3 caracteres'),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(UserRole),
  active: z.boolean().optional(),
})

async function getUsers(req: AuthenticatedRequest) {
  try {
    const { user: authUser } = req
    if (!authUser || (authUser.role !== 'ADMIN' && authUser.role !== 'GERENTE')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sales: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users })
  } catch (error: any) {
    console.error('❌ Erro ao buscar usuários:', error)
    return NextResponse.json({ 
      error: 'Erro ao buscar usuários',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

async function createUser(req: AuthenticatedRequest) {
  try {
    const { user } = req
    if (!user || (user.role !== 'ADMIN' && user.role !== 'GERENTE')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const data = userSchema.parse(body)

    const existingUser = await prisma.user.findUnique({
      where: { username: data.username },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Nome de usuário já cadastrado' }, { status: 400 })
    }

    if (!data.password) {
      return NextResponse.json({ error: 'Senha é obrigatória' }, { status: 400 })
    }

    const hashedPassword = await hashPassword(data.password)

    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        password: hashedPassword,
        role: data.role,
        active: data.active ?? true,
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        active: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('❌ Erro ao criar usuário:', error)
    return NextResponse.json({ 
      error: 'Erro ao criar usuário',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

export const GET = withAuth(getUsers)
export const POST = withAuth(createUser)
