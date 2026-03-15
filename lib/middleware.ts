import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, requireRole, UserRole } from './auth'
import { AUTH } from './constants'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string
    username: string
    role: UserRole
  }
}

export function withAuth(
  handler: (req: AuthenticatedRequest, context?: any) => Promise<NextResponse>,
  requiredRole?: UserRole
) {
  return async (req: NextRequest, context?: any) => {
    try {
      const token =
        req.cookies.get(AUTH.TOKEN_COOKIE)?.value ||
        req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
        req.cookies.get(AUTH.BEARER_COOKIE)?.value

      if (!token) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
      }

      const payload = verifyToken(token)
      if (!payload) {
        return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
      }

      if (requiredRole && !requireRole(payload.role, requiredRole)) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
      }

      const authenticatedReq = req as AuthenticatedRequest
      authenticatedReq.user = payload

      return handler(authenticatedReq, context)
    } catch (error) {
      return NextResponse.json({ error: 'Erro de autenticação' }, { status: 401 })
    }
  }
}
