import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { hashPassword } from '@/lib/auth'
import { UserRole } from '@prisma/client'

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  username: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(UserRole).optional(),
  active: z.boolean().optional(),
})

async function updateUser(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { user } = req
    
    if (!user || (user.role !== 'ADMIN' && user.role !== 'GERENTE')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const data = updateUserSchema.parse(body)

    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    if (data.username && data.username !== existingUser.username) {
      const usernameExists = await prisma.user.findUnique({
        where: { username: data.username },
      })

      if (usernameExists) {
        return NextResponse.json({ error: 'Nome de usuário já cadastrado' }, { status: 400 })
      }
    }

    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.username !== undefined) updateData.username = data.username
    if (data.role !== undefined) updateData.role = data.role
    if (data.active !== undefined) updateData.active = data.active
    if (data.password) {
      updateData.password = await hashPassword(data.password)
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        active: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('❌ Erro ao atualizar usuário:', error)
    return NextResponse.json({ 
      error: 'Erro ao atualizar usuário',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

async function deleteUser(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { user } = req
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem excluir usuários.' }, { status: 403 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            sales: true,
          },
        },
      },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    if (existingUser.id === user.userId) {
      return NextResponse.json({ error: 'Você não pode excluir sua própria conta' }, { status: 400 })
    }

    if (existingUser._count.sales > 0) {
      return NextResponse.json({ 
        error: 'Não é possível excluir usuário com vendas associadas. Desative o usuário ao invés de excluí-lo.' 
      }, { status: 400 })
    }

    await prisma.user.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Usuário excluído com sucesso' })
  } catch (error: any) {
    console.error('❌ Erro ao excluir usuário:', error)
    return NextResponse.json({ 
      error: 'Erro ao excluir usuário',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

export const PUT = withAuth(updateUser)
export const DELETE = withAuth(deleteUser)
