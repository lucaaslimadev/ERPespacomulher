import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const supplierUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable().or(z.literal('')),
  email: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  cnpj: z.string().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable().or(z.literal('')),
  observations: z.string().optional().nullable().or(z.literal('')),
})

function toNullIfEmpty(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s === '' ? null : s
}

async function updateSupplier(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { user } = req
    if (!user || (user.role !== 'GERENTE' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const data = supplierUpdateSchema.parse(body)

    const updateData: Record<string, string | null> = {}
    if (data.name !== undefined) updateData.name = data.name.trim()
    if (data.phone !== undefined) updateData.phone = toNullIfEmpty(data.phone)
    if (data.email !== undefined) updateData.email = toNullIfEmpty(data.email)
    if (data.cnpj !== undefined) updateData.cnpj = toNullIfEmpty(data.cnpj)
    if (data.address !== undefined) updateData.address = toNullIfEmpty(data.address)
    if (data.observations !== undefined) updateData.observations = toNullIfEmpty(data.observations)

    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ supplier })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map((e) => e.message).filter(Boolean).join(', ') || 'Dados inválidos'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error('❌ Erro ao atualizar fornecedor:', error)
    return NextResponse.json({ 
      error: 'Erro ao atualizar fornecedor',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

async function deleteSupplier(req: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const { user } = req
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Verificar se há contas a pagar vinculadas
    const accountsCount = await prisma.accountsPayable.count({
      where: { supplierId: params.id },
    })

    if (accountsCount > 0) {
      return NextResponse.json({ 
        error: `Não é possível excluir este fornecedor. Ele está vinculado a ${accountsCount} conta(s) a pagar.` 
      }, { status: 400 })
    }

    await prisma.supplier.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Fornecedor excluído com sucesso' })
  } catch (error: any) {
    console.error('❌ Erro ao excluir fornecedor:', error)
    return NextResponse.json({ 
      error: 'Erro ao excluir fornecedor',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}

export const PUT = withAuth(updateSupplier)
export const DELETE = withAuth(deleteSupplier)
