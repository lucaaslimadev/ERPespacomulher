import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/db'

async function searchProducts(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')
    const smart = searchParams.get('smart') === 'true' // Busca inteligente

    if (!query || query.length < 2) {
      return NextResponse.json({ products: [] })
    }

    // Busca inteligente: produtos que começam com o texto
    // Busca normal: produtos que contêm o texto
    const whereClause: any = {
      active: true,
    }

    if (smart && query.length >= 2) {
      // Busca inteligente: aceita abreviações e palavras parciais
      // Busca produtos que começam com o texto OU contêm o texto
      // Também busca por palavras individuais para aceitar abreviações
      const words = query.trim().split(/\s+/).filter(w => w.length > 0)
      const conditions: any[] = []
      
      // Busca completa
      conditions.push(
        { name: { startsWith: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
        { barcode: { equals: query, mode: 'insensitive' } },
        { sku: { equals: query, mode: 'insensitive' } }
      )
      
      // Busca por palavras individuais (para aceitar abreviações)
      words.forEach((word: string) => {
        if (word.length >= 2) {
          conditions.push(
            { name: { startsWith: word, mode: 'insensitive' } },
            { name: { contains: word, mode: 'insensitive' } }
          )
        }
      })
      
      whereClause.OR = conditions
    } else {
      // Busca normal: contém o texto
      whereClause.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { barcode: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
      ]
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        variations: {
          where: {
            quantity: { gt: 0 },
          },
          orderBy: [{ color: 'asc' }, { size: 'asc' }],
        },
      },
      take: 20,
      orderBy: smart ? [{ name: 'asc' }] : undefined,
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Erro ao buscar produtos:', error)
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 })
  }
}

export const GET = withAuth(searchProducts)
