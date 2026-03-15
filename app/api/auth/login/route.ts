import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, generateToken } from '@/lib/auth'
import { AUTH } from '@/lib/constants'

// Rate limit simples em memória (para produção, use Redis ou similar)
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 60 * 1000 // 1 minuto

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = loginAttempts.get(ip)
  if (!record) return true
  if (now > record.resetAt) {
    loginAttempts.delete(ip)
    return true
  }
  return record.count < MAX_ATTEMPTS
}

function recordAttempt(ip: string): void {
  const now = Date.now()
  const record = loginAttempts.get(ip)
  if (!record) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    record.count++
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Muitas tentativas de login. Aguarde 1 minuto.' },
        { status: 429 }
      )
    }

    let username: string
    let password: string
    try {
      const body = await req.json()
      // Login é sempre por nome de usuário (username) + senha
      const rawUsername = body.username
      const rawPassword = body.password
      username =
        typeof rawUsername === 'string'
          ? rawUsername.trim().slice(0, 256)
          : ''
      password =
        typeof rawPassword === 'string' ? rawPassword.slice(0, 512) : ''
    } catch {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuário e senha são obrigatórios' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { username },
    })

    if (!user || !user.active) {
      recordAttempt(ip)
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      recordAttempt(ip)
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    })

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      token, // Fallback para Docker: frontend envia no header Authorization quando cookie falha
    })

    const isHttps = req.headers.get('x-forwarded-proto') === 'https'
    response.cookies.set(AUTH.TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Erro no login:', error)
    return NextResponse.json(
      { error: 'Erro ao fazer login' },
      { status: 500 }
    )
  }
}
