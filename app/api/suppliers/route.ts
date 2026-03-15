import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const supplierSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phone: z.union([z.null(), z.string()]).optional().transform(v => (v == null || String(v).trim() === '') ? null : String(v).trim()),
  email: z.union([z.null(), z.literal(''), z.string().email('Email inválido')]).optional().transform(v => (v == null || String(v).trim() === '') ? null : String(v).trim()),
  cnpj: z.union([z.null(), z.string()]).optional().transform(v => (v == null || String(v).trim() === '') ? null : String(v).trim()),
  address: z.union([z.null(), z.string()]).optional().transform(v => (v == null || String(v).trim() === '') ? null : String(v).trim()),
  observations: z.union([z.null(), z.string()]).optional().transform(v => (v == null || String(v).trim() === '') ? null : String(v).trim()),
})

async function getSuppliers(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cnpj: { contains: search, mode: 'insensitive' } },
      ]
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        _count: {
          select: { accountsPayable: true },
        },
      },
      orderBy: { name: 'asc' },
      take: 100,
    })

    return NextResponse.json({ suppliers })
  } catch (error) {
    console.error('Erro ao buscar fornecedores:', error)
    return NextResponse.json({ error: 'Erro ao buscar fornecedores' }, { status: 500 })
  }
}

function toNullIfEmpty(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s === '' ? null : s
}

async function createSupplier(req: AuthenticatedRequest) {
  try {
    const { user } = req
    if (!user || (user.role !== 'GERENTE' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await req.json()
    const data = supplierSchema.parse(body)

    const supplier = await prisma.supplier.create({
      data: {
        name: data.name.trim(),
        phone: data.phone ?? null,
        email: data.email ?? null,
        cnpj: data.cnpj ?? null,
        address: data.address ?? null,
        observations: data.observations ?? null,
      },
    })

    console.log(`[API] Fornecedor criado: ${supplier.id} - ${supplier.name}`)
    return NextResponse.json({ supplier }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map((e) => e.message).filter(Boolean).join(', ') || 'Dados inválidos'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error('[API] Erro ao criar fornecedor:', error)
    const msg = error instanceof Error ? error.message : 'Erro ao criar fornecedor'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export const GET = withAuth(getSuppliers)
export const POST = withAuth(createSupplier)
