import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const customerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phone: z.string().min(1, 'Telefone é obrigatório'),
  email: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  observations: z.string().optional().nullable(),
})

async function getCustomers(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: { sales: true },
        },
      },
      orderBy: { name: 'asc' },
      take: 50,
    })

    return NextResponse.json({ customers })
  } catch (error) {
    console.error('Erro ao buscar clientes:', error)
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 })
  }
}

async function createCustomer(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Converter string vazia para null em email
    if (body.email === '') {
      body.email = null
    }
    
    const data = customerSchema.parse(body)

    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone || '',
        email: data.email || null,
        observations: data.observations || null,
      },
    })

    return NextResponse.json({ customer }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Erro de validação:', error.errors)
      return NextResponse.json({ 
        error: 'Dados inválidos',
        details: error.errors 
      }, { status: 400 })
    }
    console.error('Erro ao criar cliente:', error)
    return NextResponse.json({ error: 'Erro ao criar cliente' }, { status: 500 })
  }
}

export const GET = withAuth(getCustomers)
export const POST = withAuth(createCustomer)
